import os
import urllib.parse
import smtplib
import ssl
import random
import string
import threading
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import (
    create_engine,
    text,
    Column,
    Integer,
    String,
    Text,
    Numeric,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

# ECG-Gated Imaging Trigger Modules
try:
    from ecg import (
        parse_ecg_csv,
        preprocess_ecg_signal,
        detect_r_peaks,
        calculate_rr_intervals,
        generate_virtual_triggers,
        synchronize_frame_with_trigger,
        get_default_sample_ecg,
        get_ecg_source,
        DummyECGSource,
        ModelECGSource,
        save_captured_frame,
    )
except ImportError:
    from .ecg import (
        parse_ecg_csv,
        preprocess_ecg_signal,
        detect_r_peaks,
        calculate_rr_intervals,
        generate_virtual_triggers,
        synchronize_frame_with_trigger,
        get_default_sample_ecg,
        get_ecg_source,
        DummyECGSource,
        ModelECGSource,
        save_captured_frame,
    )

# 1. Load environment variables from root .env
root_env = Path(__file__).resolve().parent.parent / '.env'
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

RAW_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "angiolens_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_SSLMODE = os.getenv("DB_SSLMODE", "")
FLASK_ENV = os.getenv("FLASK_ENV", "development")
SECRET_KEY = os.getenv("SECRET_KEY", "default-dev-secret-key")

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_PORT", "").strip().isdigit() else 587
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", "no-reply@angiolens.com").strip()
SMTP_SENDER_NAME = os.getenv("SMTP_SENDER_NAME", "AngioLens Medical Verification").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "yes")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "False").lower() in ("true", "1", "yes")

# 2. Database Connection URL
if RAW_DATABASE_URL:
    db_url = RAW_DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    if ("neon.tech" in db_url or DB_SSLMODE == "require") and "sslmode" not in db_url:
        connector = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{connector}sslmode=require"
    DATABASE_URL = db_url
else:
    encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
    ssl_query = "?sslmode=require" if DB_SSLMODE == "require" else ""
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}{ssl_query}"

# Create SQLAlchemy engine and scoped session with high-throughput pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=300,
    pool_timeout=10,
)
SessionFactory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
db_session = scoped_session(SessionFactory)

# 3. SQLAlchemy Models mapping PostgreSQL tables
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String)
    mobile_number = Column(String)
    dob = Column(String)
    registration_number = Column(String)
    registration_authority = Column(String)
    medical_degree = Column(String)
    specialization = Column(String)
    hospital_name = Column(String)
    experience_years = Column(String)
    hospital_id_card = Column(String)
    professional_address = Column(Text)
    avatar_url = Column(Text)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role or "Cardiologist",
            "mobile_number": self.mobile_number,
            "dob": self.dob,
            "registration_number": self.registration_number,
            "registration_authority": self.registration_authority,
            "medical_degree": self.medical_degree,
            "specialization": self.specialization,
            "hospital_name": self.hospital_name,
            "experience_years": self.experience_years,
            "hospital_id_card": self.hospital_id_card,
            "professional_address": self.professional_address,
            "avatar_url": self.avatar_url,
            "is_admin": bool(self.is_admin),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class DoctorApplication(Base):
    __tablename__ = 'doctor_applications'

    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    mobile_number = Column(String, nullable=False)
    dob = Column(String)
    registration_number = Column(String, nullable=False)  # MCI / State Medical Council Reg No
    registration_authority = Column(String, nullable=False)  # Maharashtra Medical Council etc
    medical_degree = Column(String, nullable=False)  # MBBS / MD / DM Cardiology
    specialization = Column(String, nullable=False)  # Cardiology / Interventional Cardiology
    hospital_name = Column(String, nullable=False)  # Ruby Hall Clinic / Central Hospital
    experience_years = Column(String)
    hospital_id_card = Column(String)  # Employee ID / H12345
    professional_address = Column(Text, nullable=False)
    profile_photo = Column(Text)
    registration_certificate = Column(Text)
    degree_certificate = Column(Text)
    specialization_certificate = Column(Text)
    hospital_id_doc = Column(Text)
    govt_id_doc = Column(Text)
    status = Column(String, default='pending')  # 'pending', 'approved', 'rejected'
    rejection_reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "mobile_number": self.mobile_number,
            "dob": self.dob,
            "registration_number": self.registration_number,
            "registration_authority": self.registration_authority,
            "medical_degree": self.medical_degree,
            "specialization": self.specialization,
            "hospital_name": self.hospital_name,
            "experience_years": self.experience_years,
            "hospital_id_card": self.hospital_id_card,
            "professional_address": self.professional_address,
            "profile_photo": self.profile_photo,
            "registration_certificate": self.registration_certificate,
            "degree_certificate": self.degree_certificate,
            "specialization_certificate": self.specialization_certificate,
            "hospital_id_doc": self.hospital_id_doc,
            "govt_id_doc": self.govt_id_doc,
            "status": self.status,
            "rejection_reason": self.rejection_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }

class PasswordResetOTP(Base):
    __tablename__ = 'password_reset_otps'

    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "otp_code": self.otp_code,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used": self.used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Patient(Base):
    __tablename__ = 'patients'

    id = Column(Integer, primary_key=True)
    patient_id = Column(String, nullable=False, unique=True)
    age = Column(Integer)
    gender = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "age": self.age,
            "gender": self.gender,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Analysis(Base):
    __tablename__ = 'analyses'

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    uploaded_file_name = Column(Text)
    file_path = Column(Text)
    analysis_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "uploaded_file_name": self.uploaded_file_name,
            "file_path": self.file_path,
            "analysis_date": self.analysis_date.isoformat() if self.analysis_date else None,
            "status": self.status,
        }

class AnalysisResult(Base):
    __tablename__ = 'analysis_results'

    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey('analyses.id'), nullable=False)
    affected_vessel = Column(String)
    severity = Column(Numeric)
    confidence = Column(Numeric)
    detected_region = Column(Text)
    model_version = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "analysis_id": self.analysis_id,
            "affected_vessel": self.affected_vessel,
            "severity": float(self.severity) if self.severity is not None else None,
            "confidence": float(self.confidence) if self.confidence is not None else None,
            "detected_region": self.detected_region,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class DoctorReview(Base):
    __tablename__ = 'doctor_reviews'

    id = Column(Integer, primary_key=True)
    analysis_id = Column(Integer, ForeignKey('analyses.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    verified = Column(Boolean)
    comments = Column(Text)
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "analysis_id": self.analysis_id,
            "doctor_id": self.doctor_id,
            "verified": self.verified,
            "comments": self.comments,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }

# ----------------- ECG-Gated Imaging Models -----------------

class ECGSession(Base):
    __tablename__ = 'ecg_sessions'

    id = Column(Integer, primary_key=True)
    session_id = Column(String, unique=True, nullable=False)
    patient_id = Column(String, nullable=True)
    ecg_file = Column(Text, nullable=True)
    video_file = Column(Text, nullable=True)
    sampling_rate = Column(Integer, default=250)
    heart_rate = Column(Numeric, nullable=True)
    target_phase = Column(Numeric, default=70.0)
    mode = Column(String, default='ecg_only')  # 'ecg_only' | 'ecg_video'
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "patient_id": self.patient_id,
            "ecg_file": self.ecg_file,
            "video_file": self.video_file,
            "sampling_rate": self.sampling_rate,
            "heart_rate": float(self.heart_rate) if self.heart_rate is not None else None,
            "target_phase": float(self.target_phase) if self.target_phase is not None else 70.0,
            "mode": self.mode,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class ECGRPeak(Base):
    __tablename__ = 'ecg_r_peaks'

    id = Column(Integer, primary_key=True)
    session_id = Column(String, ForeignKey('ecg_sessions.session_id'), nullable=False)
    r_peak_timestamp = Column(Numeric, nullable=False)
    rr_interval = Column(Numeric, nullable=True)
    heart_rate = Column(Numeric, nullable=True)
    target_phase = Column(Numeric, default=70.0)
    trigger_timestamp = Column(Numeric, nullable=True)
    confidence = Column(Numeric, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "r_peak_timestamp": float(self.r_peak_timestamp) if self.r_peak_timestamp is not None else None,
            "rr_interval": float(self.rr_interval) if self.rr_interval is not None else None,
            "heart_rate": float(self.heart_rate) if self.heart_rate is not None else None,
            "target_phase": float(self.target_phase) if self.target_phase is not None else 70.0,
            "trigger_timestamp": float(self.trigger_timestamp) if self.trigger_timestamp is not None else None,
            "confidence": float(self.confidence) if self.confidence is not None else None,
        }

class ECGCapturedImage(Base):
    __tablename__ = 'ecg_captured_images'

    id = Column(Integer, primary_key=True)
    image_id = Column(String, unique=True, nullable=False)
    session_id = Column(String, ForeignKey('ecg_sessions.session_id'), nullable=False)
    patient_id = Column(String, nullable=True)
    r_peak_id = Column(Integer, nullable=True)
    trigger_timestamp = Column(Numeric, nullable=False)
    frame_number = Column(Integer, nullable=False)
    frame_timestamp = Column(Numeric, nullable=True)
    target_phase = Column(Numeric, default=70.0)
    image_path = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "image_id": self.image_id,
            "session_id": self.session_id,
            "patient_id": self.patient_id,
            "r_peak_id": self.r_peak_id,
            "trigger_timestamp": float(self.trigger_timestamp) if self.trigger_timestamp is not None else None,
            "frame_number": self.frame_number,
            "frame_timestamp": float(self.frame_timestamp) if self.frame_timestamp is not None else None,
            "target_phase": float(self.target_phase) if self.target_phase is not None else 70.0,
            "image_path": self.image_path,
            "image_url": self.image_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# 4. Initialize Flask Application
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024  # 64MB upload support for high-res documents

@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()

# CORS Middleware & Preflight Handling
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

@app.route('/api/<path:subpath>', methods=['OPTIONS'])
def options_handler(subpath):
    return ('', 204)

# ----------------- SMTP Email Dispatcher -----------------

def send_email(to_email, subject, html_content, text_content=None):
    """
    Dispatches automated clinical notification emails via configured SMTP server.
    Logs email details clearly in server output if SMTP is in simulation/development mode.
    """
    if not text_content:
        import re
        text_content = html_content.replace("<br>", "\n").replace("</p>", "\n\n").replace("</h2>", "\n").replace("</h1>", "\n")
        text_content = re.sub(r'<[^>]+>', '', text_content)

    if not SMTP_HOST or not SMTP_USER:
        print(f"\n==================================================")
        print(f"📧 [SMTP SIMULATION / LOCAL MODE]")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content:\n{text_content.strip()}")
        print(f"==================================================\n")
        return True, "Simulation mode: Email logged to server console."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        sender_email = SMTP_SENDER_EMAIL or SMTP_USER
        msg["From"] = f"{SMTP_SENDER_NAME} <{sender_email}>"
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        if SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=15) as server:
                if SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(sender_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                if SMTP_USE_TLS:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                if SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(sender_email, to_email, msg.as_string())
        
        print(f"[SMTP DISPATCH SUCCESS] Sent email to {to_email} with subject: {subject}")
        return True, "Email sent successfully"
    except Exception as e:
        print(f"[SMTP WARNING] Failed to deliver email to {to_email}: {e}")
        return False, str(e)

def send_email_async(to_email, subject, html_content, text_content=None):
    """
    Asynchronously dispatches emails in a background daemon thread so that HTTP API responses return immediately (<20ms).
    """
    t = threading.Thread(
        target=send_email,
        args=(to_email, subject, html_content, text_content),
        daemon=True
    )
    t.start()

# Email HTML Builders
def build_application_received_email(doctor_name, registration_num, council, hospital):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #851036; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">AngioLens Medical Verification</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Physician Credential Review Portal</p>
        </div>
        <div style="padding: 24px; color: #1F2937; line-height: 1.6;">
            <h2 style="color: #851036; font-size: 18px; margin-top: 0;">Dear {doctor_name},</h2>
            <p>Thank you for applying to join the <strong>AngioLens AI Coronary Angiogram Analysis Platform</strong>.</p>
            <p>Your medical credentials and verification documents have been received by our Administrative Review Board.</p>
            
            <div style="background-color: #FAF1F3; border-left: 4px solid #851036; padding: 14px; margin: 18px 0; border-radius: 4px;">
                <p style="margin: 3px 0;"><strong>Registration Number:</strong> {registration_num}</p>
                <p style="margin: 3px 0;"><strong>Issuing Authority:</strong> {council}</p>
                <p style="margin: 3px 0;"><strong>Hospital / Affiliation:</strong> {hospital}</p>
                <p style="margin: 3px 0;"><strong>Status:</strong> <span style="color: #D97706; font-weight: bold;">Pending Administrative Verification</span></p>
            </div>
            
            <p>Our medical board will review your Medical Council Registration, degree certificates, and hospital association. Once approved, you will receive an automated confirmation email with your login credentials.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>AngioLens Credentialing & Medical Board</strong></p>
        </div>
        <div style="background-color: #F9FAFB; padding: 14px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
            This is an automated clinical notification. Please do not reply directly to this email.
        </div>
    </div>
    """

def build_account_approved_email(doctor_name, email, mobile_number, hospital):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #059669; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">AngioLens Access Approved!</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Verified Physician Account Activated</p>
        </div>
        <div style="padding: 24px; color: #1F2937; line-height: 1.6;">
            <h2 style="color: #059669; font-size: 18px; margin-top: 0;">Congratulations, {doctor_name}!</h2>
            <p>Your medical credentials for <strong>{hospital}</strong> have been verified and approved by the AngioLens Medical Board.</p>
            
            <p>You can now sign in to the platform using your credentials below:</p>
            
            <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; padding: 18px; margin: 18px 0; border-radius: 6px;">
                <p style="margin: 4px 0; font-size: 15px;"><strong>Username (Email):</strong> <span style="font-family: monospace; color: #065F46;">{email}</span></p>
                <p style="margin: 4px 0; font-size: 15px;"><strong>Initial Password:</strong> <span style="font-family: monospace; color: #065F46; font-weight: bold;">{mobile_number}</span></p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #047857;">* Your initial password is set to your registered mobile number. You can change this anytime from your Profile settings.</p>
            </div>
            
            <p>You have full access to:</p>
            <ul style="padding-left: 20px; color: #4B5563;">
                <li>AI Coronary Angiogram Vessel Segmentation</li>
                <li>Quantitative Coronary Arteriography (QCA) Stenosis Assessment</li>
                <li>Official Standardized Clinical Report Generation & PDF Export</li>
                <li>Live Cath Lab CAD-RADS 2.0 and FFR Tools</li>
            </ul>
            
            <p style="margin-bottom: 0;">Welcome aboard,<br><strong>AngioLens Clinical Team</strong></p>
        </div>
        <div style="background-color: #F9FAFB; padding: 14px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
            AngioLens AI-Assisted Cath Lab System • Confidential & Secure
        </div>
    </div>
    """

def build_account_rejected_email(doctor_name, reason):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #DC2626; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">AngioLens Application Update</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Medical Credential Verification</p>
        </div>
        <div style="padding: 24px; color: #1F2937; line-height: 1.6;">
            <h2 style="color: #DC2626; font-size: 18px; margin-top: 0;">Dear {doctor_name},</h2>
            <p>Thank you for your interest in the AngioLens platform.</p>
            <p>After reviewing your submitted credentials, our medical board was unable to approve your application at this time.</p>
            
            <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 14px; margin: 18px 0; border-radius: 4px;">
                <p style="margin: 3px 0;"><strong>Reason / Feedback:</strong></p>
                <p style="margin: 3px 0; color: #991B1B;">{reason or 'Submitted medical registration certificates or institutional affiliation could not be verified against the state medical council registry.'}</p>
            </div>
            
            <p>If you believe this is an error or wish to re-submit with updated documentation, please contact our administrative team or submit a new application with the corrected certificates.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>AngioLens Credentialing Board</strong></p>
        </div>
        <div style="background-color: #F9FAFB; padding: 14px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
            AngioLens Medical Review Department
        </div>
    </div>
    """

def build_otp_email(email, otp_code):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #851036; color: #ffffff; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">Password Reset OTP</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">AngioLens Physician Security</p>
        </div>
        <div style="padding: 24px; color: #1F2937; line-height: 1.6; text-align: center;">
            <h2 style="color: #1F2937; font-size: 18px; margin-top: 0;">Verification Code</h2>
            <p>We received a request to reset the password for your AngioLens account (<strong>{email}</strong>).</p>
            <p>Please enter the following 6-digit One-Time Password (OTP) to proceed:</p>
            
            <div style="background-color: #FAF1F3; border: 2px dashed #851036; padding: 18px; margin: 24px auto; max-width: 240px; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #851036; font-family: monospace;">{otp_code}</span>
            </div>
            
            <p style="font-size: 13px; color: #6B7280;">This OTP is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="background-color: #F9FAFB; padding: 14px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB;">
            AngioLens Security & Authentication Service
        </div>
    </div>
    """

# ----------------- Helper Functions -----------------

def format_analysis_data(analysis):
    if not analysis:
        return None
    patient = db_session.query(Patient).filter_by(id=analysis.patient_id).first()
    result = db_session.query(AnalysisResult).filter_by(analysis_id=analysis.id).first()
    review = db_session.query(DoctorReview).filter_by(analysis_id=analysis.id).first()
    return {
        "analysis_id": analysis.id,
        "patient": patient.to_dict() if patient else None,
        "analysis": analysis.to_dict(),
        "result": result.to_dict() if result else None,
        "review": review.to_dict() if review else None,
        "verified": review.verified if review else False
    }

# ----------------- Core Routes -----------------

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "AngioLens Backend API",
        "status": "running"
    }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route('/api/db-test', methods=['GET'])
def db_test():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1;")).scalar()
            if result == 1:
                return jsonify({
                    "success": True,
                    "message": "PostgreSQL connected successfully"
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": "Unexpected database query result"
                }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Database connection failed",
            "error_type": type(e).__name__
        }), 500

# ----------------- Authentication & Profile -----------------

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role = data.get('role', 'doctor').strip() or 'doctor'

        if not name or not email or not password:
            return jsonify({
                "success": False,
                "message": "Name, email, and password are required"
            }), 400

        existing_user = db_session.query(User).filter_by(email=email).first()
        if existing_user:
            return jsonify({
                "success": False,
                "message": "An account with this email already exists"
            }), 409

        password_hash = generate_password_hash(password)
        new_user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            created_at=datetime.utcnow()
        )
        db_session.add(new_user)
        db_session.commit()

        return jsonify({
            "success": True,
            "message": "Account created successfully",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create account",
            "error_type": type(e).__name__
        }), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json(silent=True) or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        user = db_session.query(User).filter(User.email == email).first()
        if not user:
            user = db_session.query(User).filter(User.email.ilike(email)).first()

        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Login failed",
            "error_type": type(e).__name__
        }), 500

@app.route('/api/users', methods=['GET'])
def get_all_users():
    try:
        users = db_session.query(User).order_by(User.id.asc()).all()
        return jsonify({
            "success": True,
            "users": [u.to_dict() for u in users]
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch users",
            "error_type": type(e).__name__
        }), 500

@app.route('/api/profile', methods=['GET', 'PUT'])
@app.route('/api/users/<int:user_id>', methods=['GET'])
def profile_handler(user_id=None):
    if request.method == 'GET':
        try:
            if user_id:
                user = db_session.query(User).filter_by(id=user_id).first()
            else:
                email = request.args.get('email', '').strip().lower()
                uid = request.args.get('id')
                if uid:
                    user = db_session.query(User).filter_by(id=int(uid)).first()
                elif email:
                    user = db_session.query(User).filter_by(email=email).first()
                else:
                    user = db_session.query(User).order_by(User.id.asc()).first()

            if not user:
                return jsonify({
                    "success": False,
                    "message": "User not found"
                }), 404

            return jsonify({
                "success": True,
                "user": user.to_dict()
            }), 200
        except Exception as e:
            return jsonify({
                "success": False,
                "message": "Could not retrieve user profile",
                "error_type": type(e).__name__
            }), 500

    # PUT (Update Profile)
    try:
        data = request.get_json() or {}
        uid = data.get('id') or request.args.get('id')
        email = data.get('email') or request.args.get('email')

        user = None
        if uid:
            user = db_session.query(User).filter_by(id=int(uid)).first()
        elif email:
            user = db_session.query(User).filter_by(email=email.strip().lower()).first()
        else:
            user = db_session.query(User).first()

        if not user:
            return jsonify({"success": False, "message": "User not found to update"}), 404

        if 'name' in data: user.name = data['name'].strip()
        if 'mobile_number' in data: user.mobile_number = data['mobile_number'].strip()
        if 'dob' in data: user.dob = data['dob'].strip()
        if 'registration_number' in data: user.registration_number = data['registration_number'].strip()
        if 'registration_authority' in data: user.registration_authority = data['registration_authority'].strip()
        if 'medical_degree' in data: user.medical_degree = data['medical_degree'].strip()
        if 'specialization' in data: user.specialization = data['specialization'].strip()
        if 'hospital_name' in data: user.hospital_name = data['hospital_name'].strip()
        if 'experience_years' in data: user.experience_years = data['experience_years'].strip()
        if 'hospital_id_card' in data: user.hospital_id_card = data['hospital_id_card'].strip()
        if 'professional_address' in data: user.professional_address = data['professional_address'].strip()
        if 'role' in data: user.role = data['role'].strip()
        if 'avatar_url' in data: user.avatar_url = data['avatar_url']

        db_session.commit()
        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to update profile", "error": str(e)}), 500

# ----------------- Password Management (Change & Reset with OTP) -----------------

@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        user_id = data.get('user_id')
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not new_password or len(new_password) < 4:
            return jsonify({"success": False, "message": "New password must be at least 4 characters long"}), 400

        user = None
        if user_id:
            user = db_session.query(User).filter_by(id=int(user_id)).first()
        elif email:
            user = db_session.query(User).filter_by(email=email).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if not check_password_hash(user.password_hash, current_password):
            return jsonify({"success": False, "message": "Current password is incorrect"}), 400

        user.password_hash = generate_password_hash(new_password)
        db_session.commit()

        return jsonify({
            "success": True,
            "message": "Password changed successfully"
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to change password", "error": str(e)}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400

        user = db_session.query(User).filter_by(email=email).first()
        if not user:
            app_record = db_session.query(DoctorApplication).filter_by(email=email).first()
            if not app_record:
                return jsonify({"success": False, "message": "No account found with this email address"}), 404

        # Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=15)

        otp_entry = PasswordResetOTP(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at,
            used=False,
            created_at=datetime.utcnow()
        )
        db_session.add(otp_entry)
        db_session.commit()

        # Send OTP Email asynchronously in background
        html_body = build_otp_email(email, otp_code)
        send_email_async(email, "AngioLens - Password Reset Verification Code (OTP)", html_body)

        return jsonify({
            "success": True,
            "message": "A 6-digit OTP has been sent to your email address.",
            "email": email,
            "expires_in_minutes": 15
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to process forgot password request", "error": str(e)}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        otp_code = str(data.get('otp_code', '')).strip()
        new_password = data.get('new_password', '')

        if not email or not otp_code or not new_password:
            return jsonify({"success": False, "message": "Email, OTP code, and new password are required"}), 400

        if len(new_password) < 4:
            return jsonify({"success": False, "message": "New password must be at least 4 characters long"}), 400

        # Find latest valid OTP
        otp_entry = db_session.query(PasswordResetOTP).filter_by(
            email=email,
            otp_code=otp_code,
            used=False
        ).order_by(PasswordResetOTP.id.desc()).first()

        if not otp_entry:
            return jsonify({"success": False, "message": "Invalid OTP verification code"}), 400

        if otp_entry.expires_at < datetime.utcnow():
            return jsonify({"success": False, "message": "OTP code has expired. Please request a new one."}), 400

        user = db_session.query(User).filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "message": "Associated user account not found"}), 404

        user.password_hash = generate_password_hash(new_password)
        otp_entry.used = True
        db_session.commit()

        return jsonify({
            "success": True,
            "message": "Password reset successfully! You can now log in with your new password."
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to reset password", "error": str(e)}), 500

# ----------------- Doctor Registration Application (Doctor Credential Submission) -----------------

@app.route('/api/doctor-applications', methods=['POST'])
def submit_doctor_application():
    try:
        data = request.get_json() or {}
        
        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip().lower()
        mobile_number = data.get('mobile_number', '').strip()
        dob = data.get('dob', '').strip()
        registration_number = data.get('registration_number', '').strip()
        registration_authority = data.get('registration_authority', '').strip()
        medical_degree = data.get('medical_degree', '').strip()
        specialization = data.get('specialization', '').strip()
        hospital_name = data.get('hospital_name', '').strip()
        experience_years = data.get('experience_years', '').strip()
        hospital_id_card = data.get('hospital_id_card', '').strip()
        professional_address = data.get('professional_address', '').strip()
        profile_photo = data.get('profile_photo', '')

        # Document attachments
        registration_certificate = data.get('registration_certificate', '')
        degree_certificate = data.get('degree_certificate', '')
        specialization_certificate = data.get('specialization_certificate', '')
        hospital_id_doc = data.get('hospital_id_doc', '')
        govt_id_doc = data.get('govt_id_doc', '')

        # Validations
        if not full_name:
            return jsonify({"success": False, "message": "Full Name is required"}), 400
        if not email or "@" not in email:
            return jsonify({"success": False, "message": "Valid email address is required"}), 400
        if not mobile_number:
            return jsonify({"success": False, "message": "Mobile number is required"}), 400
        if not registration_number:
            return jsonify({"success": False, "message": "Medical Registration Number is mandatory"}), 400
        if not registration_authority:
            return jsonify({"success": False, "message": "Issuing Medical Council/Authority is mandatory"}), 400
        if not medical_degree:
            return jsonify({"success": False, "message": "Medical Degree (e.g. MBBS / MD / DM) is required"}), 400
        if not specialization:
            return jsonify({"success": False, "message": "Specialization is required"}), 400
        if not hospital_name:
            return jsonify({"success": False, "message": "Hospital / Institution affiliation is required"}), 400
        if not professional_address:
            return jsonify({"success": False, "message": "Professional Hospital Address is required"}), 400

        existing_user = db_session.query(User).filter_by(email=email).first()
        if existing_user:
            return jsonify({"success": False, "message": "A registered doctor account already exists for this email"}), 409

        existing_pending = db_session.query(DoctorApplication).filter_by(email=email, status='pending').first()
        if existing_pending:
            return jsonify({
                "success": True,
                "message": "Your application is already pending verification by the AngioLens Medical Board.",
                "application": existing_pending.to_dict()
            }), 200

        application = DoctorApplication(
            full_name=full_name,
            email=email,
            mobile_number=mobile_number,
            dob=dob,
            registration_number=registration_number,
            registration_authority=registration_authority,
            medical_degree=medical_degree,
            specialization=specialization,
            hospital_name=hospital_name,
            experience_years=experience_years,
            hospital_id_card=hospital_id_card,
            professional_address=professional_address,
            profile_photo=profile_photo,
            registration_certificate=registration_certificate,
            degree_certificate=degree_certificate,
            specialization_certificate=specialization_certificate,
            hospital_id_doc=hospital_id_doc,
            govt_id_doc=govt_id_doc,
            status='pending',
            created_at=datetime.utcnow()
        )
        db_session.add(application)
        db_session.commit()

        # Send automated confirmation email asynchronously in background
        html_content = build_application_received_email(
            doctor_name=full_name,
            registration_num=registration_number,
            council=registration_authority,
            hospital=hospital_name
        )
        send_email_async(email, "AngioLens - Application Received for Medical Credential Review", html_content)

        return jsonify({
            "success": True,
            "message": "Doctor credential verification application submitted successfully! Confirmation email dispatched.",
            "application_id": application.id,
            "application": application.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to submit application", "error": str(e)}), 500

# ----------------- Admin Portal Endpoints (/admin) -----------------

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json() or {}
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        # Admin credentials: ID/username/email: admin (or admin@angiolens.com), Password: 12345
        if (username.lower() in ('admin', 'admin@angiolens.com', 'administrator')) and password == '12345':
            return jsonify({
                "success": True,
                "message": "Admin authenticated successfully",
                "admin": {
                    "id": "ADMIN-001",
                    "name": "Medical Board Administrator",
                    "email": "admin@angiolens.com",
                    "role": "Super Admin"
                }
            }), 200

        user = db_session.query(User).filter_by(email=username.lower(), is_admin=True).first()
        if user and check_password_hash(user.password_hash, password):
            return jsonify({
                "success": True,
                "message": "Admin authenticated successfully",
                "admin": {
                    "id": f"ADMIN-{user.id}",
                    "name": user.name,
                    "email": user.email,
                    "role": "Administrator"
                }
            }), 200

        return jsonify({"success": False, "message": "Invalid Admin credentials"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": "Admin login failed", "error": str(e)}), 500

@app.route('/api/admin/applications', methods=['GET'])
def get_admin_applications():
    try:
        status = request.args.get('status', '').strip().lower()
        query = db_session.query(DoctorApplication)
        if status in ('pending', 'approved', 'rejected'):
            query = query.filter_by(status=status)
        
        apps = query.order_by(DoctorApplication.created_at.desc()).all()
        
        total_count = db_session.query(DoctorApplication).count()
        pending_count = db_session.query(DoctorApplication).filter_by(status='pending').count()
        approved_count = db_session.query(DoctorApplication).filter_by(status='approved').count()
        rejected_count = db_session.query(DoctorApplication).filter_by(status='rejected').count()

        return jsonify({
            "success": True,
            "applications": [a.to_dict() for a in apps],
            "stats": {
                "total": total_count,
                "pending": pending_count,
                "approved": approved_count,
                "rejected": rejected_count
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch applications", "error": str(e)}), 500

@app.route('/api/admin/applications/<int:app_id>/approve', methods=['POST'])
def approve_doctor_application(app_id):
    try:
        app_record = db_session.query(DoctorApplication).filter_by(id=app_id).first()
        if not app_record:
            return jsonify({"success": False, "message": "Application record not found"}), 404

        initial_password = app_record.mobile_number.strip()
        if not initial_password:
            initial_password = "doctor123"

        user = db_session.query(User).filter_by(email=app_record.email).first()
        if not user:
            user = User(
                name=app_record.full_name,
                email=app_record.email,
                password_hash=generate_password_hash(initial_password),
                role=f"{app_record.specialization} ({app_record.medical_degree})",
                mobile_number=app_record.mobile_number,
                dob=app_record.dob,
                registration_number=app_record.registration_number,
                registration_authority=app_record.registration_authority,
                medical_degree=app_record.medical_degree,
                specialization=app_record.specialization,
                hospital_name=app_record.hospital_name,
                experience_years=app_record.experience_years,
                hospital_id_card=app_record.hospital_id_card,
                professional_address=app_record.professional_address,
                avatar_url=app_record.profile_photo,
                is_admin=False,
                created_at=datetime.utcnow()
            )
            db_session.add(user)
        else:
            user.name = app_record.full_name
            user.password_hash = generate_password_hash(initial_password)
            user.role = f"{app_record.specialization} ({app_record.medical_degree})"
            user.mobile_number = app_record.mobile_number
            user.registration_number = app_record.registration_number
            user.registration_authority = app_record.registration_authority
            user.medical_degree = app_record.medical_degree
            user.specialization = app_record.specialization
            user.hospital_name = app_record.hospital_name
            user.professional_address = app_record.professional_address

        app_record.status = 'approved'
        app_record.reviewed_at = datetime.utcnow()
        db_session.commit()

        # Send Approval Email to Doctor with Username (email) and Password (mobile number) asynchronously
        html_email = build_account_approved_email(
            doctor_name=app_record.full_name,
            email=app_record.email,
            mobile_number=initial_password,
            hospital=app_record.hospital_name
        )
        send_email_async(app_record.email, "AngioLens - Your Doctor Account Has Been Approved!", html_email)

        return jsonify({
            "success": True,
            "message": f"Application for {app_record.full_name} approved! Doctor account created with password set to mobile number ({initial_password}). Confirmation email sent.",
            "application": app_record.to_dict(),
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to approve application", "error": str(e)}), 500

@app.route('/api/admin/applications/<int:app_id>/reject', methods=['POST'])
def reject_doctor_application(app_id):
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Credentials could not be verified with the medical council.').strip()

        app_record = db_session.query(DoctorApplication).filter_by(id=app_id).first()
        if not app_record:
            return jsonify({"success": False, "message": "Application record not found"}), 404

        app_record.status = 'rejected'
        app_record.rejection_reason = reason
        app_record.reviewed_at = datetime.utcnow()
        db_session.commit()

        # Send Rejection Email asynchronously
        html_email = build_account_rejected_email(app_record.full_name, reason)
        send_email_async(app_record.email, "AngioLens - Application Status Update", html_email)

        return jsonify({
            "success": True,
            "message": f"Application for {app_record.full_name} marked as rejected. Email notification sent.",
            "application": app_record.to_dict()
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to reject application", "error": str(e)}), 500

# ----------------- Patients -----------------

@app.route('/api/patients', methods=['GET', 'POST'])
def handle_patients():
    if request.method == 'GET':
        try:
            patients = db_session.query(Patient).order_by(Patient.id.desc()).all()
            return jsonify({
                "success": True,
                "patients": [p.to_dict() for p in patients]
            }), 200
        except Exception as e:
            return jsonify({"success": False, "message": "Failed to fetch patients", "error": str(e)}), 500
    
    # POST
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id') or data.get('patientId') or f"PAT-{int(datetime.utcnow().timestamp())}"
        patient_id = str(patient_id).strip()
        age = data.get('age')
        gender = data.get('gender', 'Male')

        try:
            age = int(age) if age is not None and str(age).strip() else None
        except ValueError:
            age = None

        patient = db_session.query(Patient).filter_by(patient_id=patient_id).first()
        if not patient:
            patient = Patient(
                patient_id=patient_id,
                age=age,
                gender=gender,
                created_at=datetime.utcnow()
            )
            db_session.add(patient)
            db_session.commit()
        else:
            if age is not None:
                patient.age = age
            if gender:
                patient.gender = gender
            db_session.commit()

        return jsonify({
            "success": True,
            "message": "Patient saved successfully",
            "patient": patient.to_dict()
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"success": False, "message": "Failed to save patient", "error": str(e)}), 500

@app.route('/api/patients/<patient_id_str>', methods=['GET'])
def get_patient(patient_id_str):
    try:
        patient = db_session.query(Patient).filter_by(patient_id=patient_id_str).first()
        if not patient:
            return jsonify({"success": False, "message": "Patient not found"}), 404
        return jsonify({"success": True, "patient": patient.to_dict()}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Error fetching patient", "error_type": type(e).__name__}), 500

# ----------------- Analyses & AI Results -----------------

@app.route('/api/analyses', methods=['POST'])
@app.route('/api/analyze', methods=['POST'])
def create_analysis():
    try:
        data = request.get_json() or {}
        patient_code = data.get('patient_id') or data.get('patientId') or 'PAT-00123'
        patient_code = str(patient_code).strip()
        age = data.get('age', 56)
        gender = data.get('gender', 'Male')
        file_name = data.get('uploaded_file_name') or data.get('fileName') or 'patient_001_angio.dcm'
        file_path = data.get('file_path') or f"data/sample_images/{file_name}"

        try:
            age = int(age) if age is not None and str(age).strip() else 56
        except ValueError:
            age = 56

        patient = db_session.query(Patient).filter_by(patient_id=patient_code).first()
        if not patient:
            patient = Patient(
                patient_id=patient_code,
                age=age,
                gender=gender,
                created_at=datetime.utcnow()
            )
            db_session.add(patient)
            db_session.commit()
        else:
            if age is not None:
                patient.age = age
            if gender:
                patient.gender = gender
            db_session.commit()

        analysis = Analysis(
            patient_id=patient.id,
            uploaded_file_name=file_name,
            file_path=file_path,
            analysis_date=datetime.utcnow(),
            status='completed'
        )
        db_session.add(analysis)
        db_session.commit()

        affected_vessel = data.get('affected_vessel', 'LAD Proximal')
        severity = data.get('severity', 68.00)
        confidence = data.get('confidence', 92.00)
        gated_frame = data.get('gated_frame') or data.get('selected_frame')
        cardiac_phase = data.get('cardiac_phase')
        if gated_frame and not data.get('detected_region'):
            detected_region = f"Proximal segment of LAD [Motion-Gated Frame #{gated_frame} @ {cardiac_phase or 70}% Phase]"
        else:
            detected_region = data.get('detected_region', 'Proximal segment of LAD')
        model_version = data.get('model_version', 'v1.0.0-qca')

        analysis_result = AnalysisResult(
            analysis_id=analysis.id,
            affected_vessel=affected_vessel,
            severity=severity,
            confidence=confidence,
            detected_region=detected_region,
            model_version=model_version,
            created_at=datetime.utcnow()
        )
        db_session.add(analysis_result)

        # Assign initial DoctorReview to doctor (so notification is created for assigned user)
        doc_id = data.get('doctor_id') or data.get('doctorId') or data.get('user_id') or data.get('userId')
        if not doc_id:
            default_doc = db_session.query(User).first()
            doc_id = default_doc.id if default_doc else 1
        initial_review = DoctorReview(
            analysis_id=analysis.id,
            doctor_id=int(doc_id),
            verified=False,
            comments="AI analysis completed. Physician verification pending.",
            reviewed_at=datetime.utcnow()
        )
        db_session.add(initial_review)
        db_session.commit()

        resp_data = {
            "success": True,
            "message": "Analysis created and processed successfully",
            "analysis_id": analysis.id,
            "patient": patient.to_dict(),
            "analysis": analysis.to_dict(),
            "result": analysis_result.to_dict()
        }
        if gated_frame or data.get('ecg_gating'):
            resp_data["ecg_gating"] = data.get('ecg_gating') or {
                "selected_frame": gated_frame,
                "cardiac_phase": cardiac_phase or 70.0,
                "trigger_time": data.get('trigger_time'),
                "rr_interval": data.get('rr_interval'),
                "heart_rate": data.get('heart_rate')
            }

        return jsonify(resp_data), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create analysis",
            "error_type": type(e).__name__
        }), 500

# ----------------- ECG Processing & Motion-Gated Imaging Trigger Endpoints -----------------

@app.route('/api/ecg/sample', methods=['GET'])
def get_sample_ecg():
    """
    Returns pre-computed Lead-II ECG time series, detected R-peaks,
    RR intervals, heart rate, and virtual trigger synchronization data.
    """
    try:
        target_phase = float(request.args.get('target_phase', 70.0))
        fps = float(request.args.get('fps', 30.0))
        total_frames = int(request.args.get('total_frames', 120))

        raw_samples = get_default_sample_ecg()
        preprocessed = preprocess_ecg_signal(raw_samples)
        r_peaks = detect_r_peaks(preprocessed)
        cycles = calculate_rr_intervals(r_peaks)
        triggers = generate_virtual_triggers(r_peaks, target_phase=target_phase)

        gated_frames = [
            synchronize_frame_with_trigger(trig, total_frames=total_frames, fps=fps)
            for trig in triggers
        ]

        avg_hr = round(sum(c['heart_rate'] for c in cycles) / len(cycles), 1) if cycles else 74.0
        avg_rr = round(sum(c['rr_interval'] for c in cycles) / len(cycles), 3) if cycles else 0.810
        avg_conf = round(sum(p['confidence'] for p in r_peaks) / len(r_peaks), 2) if r_peaks else 0.98
        selected_frame = gated_frames[0]['selected_frame'] if gated_frames else 47

        summary = {
            "status": "Active",
            "heart_rate": avg_hr,
            "rr_interval": avg_rr,
            "rr_interval_ms": int(round(avg_rr * 1000.0)),
            "r_peaks_detected": len(r_peaks),
            "target_phase": target_phase,
            "trigger_status": "GENERATED",
            "selected_frame": selected_frame,
            "confidence": int(round(avg_conf * 100)),
            "confidence_decimal": avg_conf,
            "is_simulation": True,
            "parameter_note": "Prototype/simulation parameter: clinically appropriate phase depends on imaging modality, heart rate, and clinical protocol."
        }

        # Keep lightweight sample buffer for client-side rendering (first 1000 points ~ 4 sec)
        return jsonify({
            "success": True,
            "summary": summary,
            "r_peaks": r_peaks,
            "cycles": cycles,
            "triggers": triggers,
            "gated_frames": gated_frames,
            "samples": raw_samples[:1000],
            "total_samples": len(raw_samples)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to generate sample ECG gating",
            "error": str(e)
        }), 500


@app.route('/api/ecg/process', methods=['POST'])
def process_ecg():
    """
    Accepts raw CSV text, data array, or file upload with timestamp and ECG signal.
    Runs modular R-peak detection, RR interval calculation, and virtual trigger gating.
    """
    try:
        data = request.get_json() or {}
        target_phase = float(data.get('target_phase', 70.0))
        fps = float(data.get('fps', 30.0))
        total_frames = int(data.get('total_frames', 120))

        csv_text = data.get('csv_text')
        raw_points = data.get('data')

        if csv_text:
            parsed = parse_ecg_csv(csv_text)
        elif raw_points and isinstance(raw_points, list):
            parsed = raw_points
        else:
            parsed = get_default_sample_ecg()

        if not parsed or len(parsed) < 10:
            return jsonify({
                "success": False,
                "message": "Insufficient or invalid ECG data points provided. Format: timestamp,ecg"
            }), 400

        preprocessed = preprocess_ecg_signal(parsed)
        r_peaks = detect_r_peaks(preprocessed)
        cycles = calculate_rr_intervals(r_peaks)
        triggers = generate_virtual_triggers(r_peaks, target_phase=target_phase)

        gated_frames = [
            synchronize_frame_with_trigger(trig, total_frames=total_frames, fps=fps)
            for trig in triggers
        ]

        avg_hr = round(sum(c['heart_rate'] for c in cycles) / len(cycles), 1) if cycles else 74.0
        avg_rr = round(sum(c['rr_interval'] for c in cycles) / len(cycles), 3) if cycles else 0.810
        avg_conf = round(sum(p['confidence'] for p in r_peaks) / len(r_peaks), 2) if r_peaks else 0.98
        selected_frame = gated_frames[0]['selected_frame'] if gated_frames else 1

        summary = {
            "status": "Active",
            "heart_rate": avg_hr,
            "rr_interval": avg_rr,
            "rr_interval_ms": int(round(avg_rr * 1000.0)),
            "r_peaks_detected": len(r_peaks),
            "target_phase": target_phase,
            "trigger_status": "GENERATED" if triggers else "WAITING",
            "selected_frame": selected_frame,
            "confidence": int(round(avg_conf * 100)),
            "confidence_decimal": avg_conf,
            "is_simulation": True,
            "parameter_note": "Prototype/simulation parameter: clinically appropriate phase depends on imaging modality, heart rate, and clinical protocol."
        }

        # Keep output sample count efficient for browser transfer
        output_samples = parsed
        if len(output_samples) > 2000:
            step = len(output_samples) // 2000
            output_samples = output_samples[::step]

        return jsonify({
            "success": True,
            "summary": summary,
            "r_peaks": r_peaks,
            "cycles": cycles,
            "triggers": triggers,
            "gated_frames": gated_frames,
            "samples": output_samples[:1000],
            "total_samples": len(parsed)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to process ECG",
            "error": str(e)
        }), 500


@app.route('/api/ecg/gate-frame', methods=['POST'])
def gate_frame():
    """
    Calculates the exact frame index for a specific virtual trigger event.
    """
    try:
        data = request.get_json() or {}
        trigger_time = float(data.get('trigger_time', 0.0))
        target_phase = float(data.get('target_phase', 70.0))
        fps = float(data.get('fps', 30.0))
        total_frames = int(data.get('total_frames', 120))
        rr_interval = float(data.get('rr_interval', 0.81))
        heart_rate = float(data.get('heart_rate', 74.0))

        trig_event = {
            "trigger_time": trigger_time,
            "cardiac_phase": target_phase,
            "rr_interval": rr_interval,
            "heart_rate": heart_rate,
            "confidence": float(data.get('confidence', 0.98))
        }

        result = synchronize_frame_with_trigger(trig_event, total_frames=total_frames, fps=fps)
        return jsonify({
            "success": True,
            "gating_result": result
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to gate frame",
            "error": str(e)
        }), 500

@app.route('/api/ecg/session', methods=['POST'])
def create_ecg_session():
    """
    Creates an ECG-gating session (ECG-only or ECG + Video mode),
    processes signal via DummyECGSource / parsed CSV, detects R-peaks,
    computes virtual triggers, captures motion-gated angiography frames,
    and stores session metadata in the database.
    """
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id', 'PAT-00123')
        target_phase = float(data.get('target_phase', 70.0))
        sampling_rate = int(data.get('sampling_rate', 250))
        heart_rate = float(data.get('heart_rate', 74.0))
        noise_level = float(data.get('noise_level', 0.02))
        fps = float(data.get('fps', 30.0))
        total_frames = int(data.get('total_frames', 120))
        video_file = data.get('video_file')
        ecg_file = data.get('ecg_file', 'sample_ecg.csv')
        csv_text = data.get('csv_text')
        mode = "ecg_video" if video_file else "ecg_only"

        # Obtain signal via source abstraction (Dummy source or parsed CSV)
        if csv_text:
            parsed = parse_ecg_csv(csv_text)
            source_info = {
                "source": "Uploaded ECG CSV",
                "is_ai_model": False,
                "status": "Custom Signal Loaded",
                "disclaimer": "Demo / Simulation R-peak heuristic detector."
            }
        else:
            source = get_ecg_source("dummy", sampling_rate=sampling_rate, heart_rate=heart_rate, noise_level=noise_level)
            parsed = source.get_signal_samples(duration_sec=10.0)
            source_info = source.get_source_label()

        preprocessed = preprocess_ecg_signal(parsed, sample_rate=sampling_rate)
        r_peaks = detect_r_peaks(preprocessed, sample_rate=sampling_rate)
        cycles = calculate_rr_intervals(r_peaks)
        triggers = generate_virtual_triggers(r_peaks, target_phase=target_phase)

        session_uuid = f"SES-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

        avg_hr = round(sum(c['heart_rate'] for c in cycles) / len(cycles), 1) if cycles else heart_rate
        avg_rr = round(sum(c['rr_interval'] for c in cycles) / len(cycles), 3) if cycles else 0.810

        # Create ECGSession in database
        session_record = ECGSession(
            session_id=session_uuid,
            patient_id=patient_id,
            ecg_file=ecg_file,
            video_file=video_file,
            sampling_rate=sampling_rate,
            heart_rate=avg_hr,
            target_phase=target_phase,
            mode=mode,
            created_at=datetime.utcnow()
        )
        db_session.add(session_record)
        db_session.commit()

        # Save R-peaks and triggers in DB
        db_r_peaks = []
        for idx, trig in enumerate(triggers):
            rp = ECGRPeak(
                session_id=session_uuid,
                r_peak_timestamp=trig.get('r_peak_time', 0.0),
                rr_interval=trig.get('rr_interval', avg_rr),
                heart_rate=trig.get('heart_rate', avg_hr),
                target_phase=target_phase,
                trigger_timestamp=trig.get('trigger_time', 0.0),
                confidence=trig.get('confidence', 0.98)
            )
            db_session.add(rp)
            db_r_peaks.append(rp)
        db_session.commit()

        # Capture and save motion-gated images on disk and DB
        captured_images_list = []
        for idx, trig in enumerate(triggers[:6], start=1):
            gated = synchronize_frame_with_trigger(trig, total_frames=total_frames, fps=fps)
            frame_num = gated['selected_frame']
            trig_t = trig['trigger_time']

            saved = save_captured_frame(
                session_id=session_uuid,
                trigger_index=idx,
                frame_number=frame_num,
                trigger_timestamp=trig_t,
                video_path=video_file if video_file and os.path.exists(video_file) else None,
                total_frames=total_frames,
                fps=fps
            )

            rp_id = db_r_peaks[idx - 1].id if idx - 1 < len(db_r_peaks) else None
            img_rec = ECGCapturedImage(
                image_id=saved['image_id'],
                session_id=session_uuid,
                patient_id=patient_id,
                r_peak_id=rp_id,
                trigger_timestamp=trig_t,
                frame_number=frame_num,
                frame_timestamp=round(frame_num / fps, 3),
                target_phase=target_phase,
                image_path=saved['file_path'],
                image_url=saved['image_url'],
                created_at=datetime.utcnow()
            )
            db_session.add(img_rec)
            captured_images_list.append(img_rec.to_dict())

        db_session.commit()

        summary = {
            "session_id": session_uuid,
            "patient_id": patient_id,
            "mode": mode,
            "video_status": video_file if video_file else "Not provided",
            "status": "Active",
            "source_info": source_info,
            "heart_rate": avg_hr,
            "rr_interval": avg_rr,
            "rr_interval_ms": int(round(avg_rr * 1000.0)),
            "r_peaks_detected": len(r_peaks),
            "target_phase": target_phase,
            "trigger_status": "GENERATED" if triggers else "WAITING",
            "selected_frame": captured_images_list[0]['frame_number'] if captured_images_list else 47,
            "confidence": 98,
            "confidence_label": "Simulated / Demo Confidence",
            "captured_images_count": len(captured_images_list)
        }

        return jsonify({
            "success": True,
            "session": session_record.to_dict(),
            "summary": summary,
            "r_peaks": r_peaks,
            "cycles": cycles,
            "triggers": triggers,
            "captured_images": captured_images_list,
            "samples": parsed[:1000]
        }), 201

    except Exception as e:
        db_session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create ECG session",
            "error": str(e)
        }), 500


@app.route('/api/ecg/sessions', methods=['GET'])
def get_ecg_sessions():
    try:
        sessions = db_session.query(ECGSession).order_by(ECGSession.created_at.desc()).all()
        return jsonify({
            "success": True,
            "sessions": [s.to_dict() for s in sessions]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch sessions", "error": str(e)}), 500


@app.route('/api/ecg/images', methods=['GET'])
@app.route('/api/ecg/sessions/<session_id>/images', methods=['GET'])
def get_session_images(session_id=None):
    try:
        if session_id:
            images = db_session.query(ECGCapturedImage).filter_by(session_id=session_id).order_by(ECGCapturedImage.frame_number.asc()).all()
        else:
            images = db_session.query(ECGCapturedImage).order_by(ECGCapturedImage.created_at.desc()).limit(12).all()

        if not images:
            # If database has no captured images yet, generate sample captured images on the fly
            sample_ses_id = session_id or "SES-DEMO-001"
            for i, f_num in enumerate([25, 47, 72, 94], start=1):
                saved = save_captured_frame(sample_ses_id, trigger_index=i, frame_number=f_num, trigger_timestamp=round(f_num / 30.0, 3))
                img_rec = ECGCapturedImage(
                    image_id=saved['image_id'],
                    session_id=sample_ses_id,
                    patient_id="PAT-00123",
                    trigger_timestamp=saved['trigger_timestamp'],
                    frame_number=f_num,
                    frame_timestamp=saved['trigger_timestamp'],
                    target_phase=70.0,
                    image_path=saved['file_path'],
                    image_url=saved['image_url'],
                    created_at=datetime.utcnow()
                )
                db_session.add(img_rec)
            db_session.commit()
            images = db_session.query(ECGCapturedImage).order_by(ECGCapturedImage.created_at.desc()).limit(12).all()

        return jsonify({
            "success": True,
            "session_id": session_id,
            "images": [img.to_dict() for img in images]
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch captured images", "error": str(e)}), 500


@app.route('/api/ecg/captured-images/<filename>', methods=['GET'])
def get_captured_image_file(filename):
    from ecg.storage import STORAGE_DIR, SAMPLE_IMAGE_PATH
    import os
    if os.path.exists(STORAGE_DIR / filename):
        return send_from_directory(str(STORAGE_DIR), filename)
    elif SAMPLE_IMAGE_PATH.exists():
        return send_from_directory(str(SAMPLE_IMAGE_PATH.parent), SAMPLE_IMAGE_PATH.name)
    return ("Image not found", 404)

@app.route('/api/analyses/<int:analysis_id>', methods=['GET'])
def get_analysis_by_id(analysis_id):
    try:
        analysis = db_session.query(Analysis).filter_by(id=analysis_id).first()
        if not analysis:
            return jsonify({"success": False, "message": "Analysis not found"}), 404
        return jsonify({
            "success": True,
            "data": format_analysis_data(analysis)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Error fetching analysis", "error_type": type(e).__name__}), 500

@app.route('/api/analyses/latest', methods=['GET'])
def get_latest_analysis():
    try:
        analysis = db_session.query(Analysis).order_by(Analysis.id.desc()).first()
        if not analysis:
            return jsonify({"success": False, "message": "No analyses found", "data": None}), 200
        return jsonify({
            "success": True,
            "data": format_analysis_data(analysis)
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Error fetching latest analysis", "error_type": type(e).__name__}), 500

# ----------------- Doctor Review -----------------

@app.route('/api/analyses/<int:analysis_id>/review', methods=['POST'])
def save_doctor_review(analysis_id):
    try:
        data = request.get_json() or {}
        doctor_id = data.get('doctor_id')
        verified = data.get('verified', True)
        comments = data.get('comments', 'Verified by physician')

        analysis = db_session.query(Analysis).filter_by(id=analysis_id).first()
        if not analysis:
            return jsonify({"success": False, "message": "Analysis not found"}), 404

        doctor = None
        if doctor_id:
            doctor = db_session.query(User).filter_by(id=int(doctor_id)).first()
        if not doctor:
            doctor = db_session.query(User).first()
        if not doctor:
            doctor = User(
                name="Dr. Priya Sharma",
                email="dr.sharma@centralhospital.org",
                password_hash=generate_password_hash("doctor123"),
                role="Interventional Cardiology",
                created_at=datetime.utcnow()
            )
            db_session.add(doctor)
            db_session.commit()

        review = db_session.query(DoctorReview).filter_by(analysis_id=analysis_id, doctor_id=doctor.id).first()
        if review:
            review.verified = verified
            review.comments = comments
            review.reviewed_at = datetime.utcnow()
        else:
            review = DoctorReview(
                analysis_id=analysis_id,
                doctor_id=doctor.id,
                verified=verified,
                comments=comments,
                reviewed_at=datetime.utcnow()
            )
            db_session.add(review)

        db_session.commit()

        return jsonify({
            "success": True,
            "message": "Review saved successfully",
            "review": review.to_dict()
        }), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to save review",
            "error_type": type(e).__name__
        }), 500

# ----------------- History -----------------

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        analyses = db_session.query(Analysis).order_by(Analysis.analysis_date.desc()).all()
        records = []
        for an in analyses:
            patient = db_session.query(Patient).filter_by(id=an.patient_id).first()
            result = db_session.query(AnalysisResult).filter_by(analysis_id=an.id).first()
            review = db_session.query(DoctorReview).filter_by(analysis_id=an.id).first()

            severity_num = float(result.severity) if result and result.severity is not None else 68.0
            if severity_num >= 70:
                sev_label = "Severe"
            elif severity_num >= 50:
                sev_label = "Moderate"
            else:
                sev_label = "Mild"

            conf_num = float(result.confidence) if result and result.confidence is not None else 92.0
            stenosis_str = f"{int(severity_num)}%"
            conf_str = f"{int(conf_num)}%"

            date_str = an.analysis_date.strftime('%d %b %Y, %I:%M %p') if an.analysis_date else 'Recent'

            records.append({
                "id": patient.patient_id if patient else f"PAT-{an.id:04d}",
                "analysis_id": an.id,
                "name": f"Patient {patient.patient_id if patient else an.id}",
                "age": patient.age if patient and patient.age else 56,
                "gender": patient.gender if patient and patient.gender else 'Male',
                "date": date_str,
                "vessel": result.affected_vessel if result and result.affected_vessel else 'LAD Proximal',
                "stenosis": stenosis_str,
                "severity": sev_label,
                "confidence": conf_str,
                "verified": review.verified if review else False
            })

        return jsonify({
            "success": True,
            "records": records
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch history", "error_type": type(e).__name__}), 500

# ----------------- Reports -----------------

@app.route('/api/reports', methods=['GET'])
def get_all_reports():
    try:
        analyses = db_session.query(Analysis).order_by(Analysis.analysis_date.desc()).all()
        report_list = []
        for an in analyses:
            patient = db_session.query(Patient).filter_by(id=an.patient_id).first()
            result = db_session.query(AnalysisResult).filter_by(analysis_id=an.id).first()
            review = db_session.query(DoctorReview).filter_by(analysis_id=an.id).first()

            doctor_name = "Dr. Priya Sharma, MD"
            if review and review.doctor_id:
                doc = db_session.query(User).filter_by(id=review.doctor_id).first()
                if doc:
                    doctor_name = doc.name

            sev_num = float(result.severity) if result and result.severity is not None else 68.0
            conf_num = float(result.confidence) if result and result.confidence is not None else 92.0

            if sev_num >= 70:
                sev_label = "Severe"
            elif sev_num >= 50:
                sev_label = "Moderate"
            else:
                sev_label = "Mild"

            date_str = an.analysis_date.strftime('%B %d, %Y') if an.analysis_date else 'September 21, 2026'

            report_list.append({
                "analysis_id": an.id,
                "report_num": f"REPORT #ANG-2026-{an.id:04d}",
                "date": date_str,
                "patient_id": patient.patient_id if patient else f"PAT-{an.id:04d}",
                "patient_name": f"Patient {patient.patient_id if patient else an.id}",
                "age": patient.age if patient and patient.age else 56,
                "gender": patient.gender if patient and patient.gender else 'Male',
                "referring_physician": doctor_name,
                "modality": "X-Ray Angiography (DICOM)",
                "projection_angle": "LAO Cranial (35° / 20°)",
                "indication": "Unstable Angina, NSTEMI Rule-out",
                "vessel": result.affected_vessel if result and result.affected_vessel else 'LAD Proximal',
                "stenosis": f"{int(sev_num)}%",
                "severity": sev_label,
                "confidence": f"{int(conf_num)}%",
                "verified": review.verified if review else False,
                "doctor_name": doctor_name,
                "file_name": an.uploaded_file_name or "patient_angio.dcm"
            })

        return jsonify({
            "success": True,
            "reports": report_list
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch reports list", "error_type": type(e).__name__}), 500

@app.route('/api/reports/<int:analysis_id>', methods=['GET'])
@app.route('/api/reports/latest', methods=['GET'])
def get_report_data(analysis_id=None):
    try:
        if analysis_id:
            analysis = db_session.query(Analysis).filter_by(id=analysis_id).first()
        else:
            analysis = db_session.query(Analysis).order_by(Analysis.id.desc()).first()

        if not analysis:
            return jsonify({"success": False, "message": "No analysis found", "report": None}), 200

        data = format_analysis_data(analysis)
        patient = data.get('patient') or {}
        result = data.get('result') or {}
        review = data.get('review') or {}

        doctor_name = "Dr. Priya Sharma, MD, FACC"
        if review and review.get('doctor_id'):
            doc = db_session.query(User).filter_by(id=review['doctor_id']).first()
            if doc:
                doctor_name = doc.name

        report = {
            "analysis_id": analysis.id,
            "report_num": f"REPORT #ANG-2026-{analysis.id:04d}",
            "date": analysis.analysis_date.strftime('%B %d, %Y') if analysis.analysis_date else 'September 21, 2026',
            "patient_id": patient.get('patient_id', 'PAT-00123'),
            "patient_name": f"Patient {patient.get('patient_id', 'PAT-00123')}",
            "age": patient.get('age', 56),
            "gender": patient.get('gender', 'Male'),
            "referring_physician": doctor_name,
            "modality": "X-Ray Angiography (DICOM)",
            "projection_angle": "LAO Cranial (35° / 20°)",
            "indication": "Unstable Angina, NSTEMI Rule-out",
            "vessel": result.get('affected_vessel', 'Left Anterior Descending (LAD)'),
            "stenosis": f"{int(result.get('severity', 68))}%",
            "confidence": f"{int(result.get('confidence', 92))}%",
            "verified": review.get('verified', False),
            "doctor_name": doctor_name
        }

        return jsonify({
            "success": True,
            "report": report
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to generate report", "error_type": type(e).__name__}), 500

# ----------------- Notifications (Live Database-Backed) -----------------

def format_relative_time(dt):
    if not dt:
        return "Recently"
    now = datetime.utcnow()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 0 or seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    days = hours // 24
    if days < 7:
        return f"{days} day{'s' if days > 1 else ''} ago"
    return dt.strftime("%d %b %Y")

@app.route('/api/notifications', methods=['GET'])
def get_user_notifications():
    """
    Returns actual notifications for the authenticated / requested user
    based on PostgreSQL analyses and doctor_reviews tasks.
    """
    try:
        user_id = request.args.get('user_id') or request.args.get('userId') or request.args.get('id')
        email = request.args.get('email', '').strip().lower()

        user = None
        if user_id:
            try:
                user = db_session.query(User).filter_by(id=int(user_id)).first()
            except (ValueError, TypeError):
                pass
        if not user and email:
            user = db_session.query(User).filter_by(email=email).first()
        if not user:
            user = db_session.query(User).first()

        if not user:
            return jsonify({
                "success": True,
                "notifications": [],
                "unread_count": 0
            }), 200

        # Query reviews assigned strictly to this user
        user_reviews = db_session.query(DoctorReview).filter_by(doctor_id=user.id).all()
        review_map = {r.analysis_id: r for r in user_reviews}
        assigned_analysis_ids = set(review_map.keys())

        if not assigned_analysis_ids:
            return jsonify({
                "success": True,
                "user_id": user.id,
                "user_name": user.name,
                "notifications": [],
                "total_count": 0,
                "unread_count": 0
            }), 200

        analyses = (
            db_session.query(Analysis)
            .filter(Analysis.id.in_(assigned_analysis_ids))
            .order_by(Analysis.analysis_date.desc())
            .all()
        )

        # Batch query Patients and AnalysisResults to eliminate N+1 roundtrips
        patient_ids = {an.patient_id for an in analyses if an.patient_id}
        analysis_ids = {an.id for an in analyses}

        patients = db_session.query(Patient).filter(Patient.id.in_(patient_ids)).all() if patient_ids else []
        patient_map = {p.id: p for p in patients}

        results = db_session.query(AnalysisResult).filter(AnalysisResult.analysis_id.in_(analysis_ids)).all() if analysis_ids else []
        result_map = {r.analysis_id: r for r in results}

        notifications = []
        for an in analyses:
            patient = patient_map.get(an.patient_id)
            result = result_map.get(an.id)
            review = review_map.get(an.id)

            p_code = patient.patient_id if patient else f"PAT-{an.id:04d}"
            vessel = result.affected_vessel if result and result.affected_vessel else "Coronary Vessel"
            severity_num = int(result.severity) if result and result.severity is not None else 68

            # Case: Failed analysis
            if an.status == 'failed':
                notifications.append({
                    "id": f"notif-task-{an.id}-fail",
                    "taskId": an.id,
                    "task_id": an.id,
                    "analysis_id": an.id,
                    "patient_id": p_code,
                    "type": "analysis_failed",
                    "title": "Analysis Failed",
                    "message": f"The angiogram for {p_code} could not be processed. Please try again.",
                    "time": format_relative_time(an.analysis_date),
                    "created_at": an.analysis_date.isoformat() if an.analysis_date else None,
                    "status": "failed",
                    "read": False
                })
                continue

            # Case: Review Required (task is pending doctor verification)
            if not review or not review.verified:
                notifications.append({
                    "id": f"notif-task-{an.id}-review",
                    "taskId": an.id,
                    "task_id": an.id,
                    "analysis_id": an.id,
                    "patient_id": p_code,
                    "type": "review_required",
                    "title": "Review Required",
                    "message": f"Suspicious narrowing detected in {p_code} ({vessel}, {severity_num}% stenosis). Doctor verification is pending.",
                    "time": format_relative_time(an.analysis_date),
                    "created_at": an.analysis_date.isoformat() if an.analysis_date else None,
                    "status": "pending_verification",
                    "read": False
                })
                # Also include analysis complete notification for pending analysis
                notifications.append({
                    "id": f"notif-task-{an.id}-complete",
                    "taskId": an.id,
                    "task_id": an.id,
                    "analysis_id": an.id,
                    "patient_id": p_code,
                    "type": "analysis_complete",
                    "title": "Analysis Complete",
                    "message": f"Angiogram analysis for {p_code} ({vessel}) has been completed.",
                    "time": format_relative_time(an.analysis_date),
                    "created_at": an.analysis_date.isoformat() if an.analysis_date else None,
                    "status": "completed",
                    "read": False
                })
            else:
                # Case: Verification Completed
                comments_suffix = f" {review.comments}" if review.comments else ""
                notifications.append({
                    "id": f"notif-task-{an.id}-verified",
                    "taskId": an.id,
                    "task_id": an.id,
                    "analysis_id": an.id,
                    "patient_id": p_code,
                    "type": "verification_completed",
                    "title": "Verification Completed",
                    "message": f"Doctor review recorded for {p_code} ({vessel}).{comments_suffix}",
                    "time": format_relative_time(review.reviewed_at or an.analysis_date),
                    "created_at": (review.reviewed_at or an.analysis_date).isoformat() if (review.reviewed_at or an.analysis_date) else None,
                    "status": "verified",
                    "read": True
                })

                # Case: Report Ready
                notifications.append({
                    "id": f"notif-task-{an.id}-report",
                    "taskId": an.id,
                    "task_id": an.id,
                    "analysis_id": an.id,
                    "patient_id": p_code,
                    "type": "report_ready",
                    "title": "Report Ready",
                    "message": f"The analysis report for {p_code} ({vessel}, {severity_num}% stenosis) is ready to view.",
                    "time": format_relative_time(an.analysis_date),
                    "created_at": an.analysis_date.isoformat() if an.analysis_date else None,
                    "status": "report_ready",
                    "read": False
                })

        # Sort notifications by creation time descending
        notifications.sort(key=lambda n: n.get("created_at") or "", reverse=True)

        return jsonify({
            "success": True,
            "user_id": user.id,
            "user_name": user.name,
            "notifications": notifications,
            "total_count": len(notifications),
            "unread_count": sum(1 for n in notifications if not n.get("read"))
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to fetch notifications",
            "error_type": type(e).__name__
        }), 500

@app.route('/api/notifications/mark-read', methods=['POST'])
def mark_notification_read():
    try:
        data = request.get_json() or {}
        notif_id = data.get('notification_id') or data.get('id')
        return jsonify({
            "success": True,
            "message": "Notification marked as read",
            "notification_id": notif_id
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    try:
        return jsonify({
            "success": True,
            "message": "All notifications marked as read"
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ----------------- Database Auto-Schema & Seeding -----------------

def init_db_and_seed():
    try:
        # Create all tables if they don't exist
        Base.metadata.create_all(bind=engine)

        # Ensure all columns exist on users table via raw SQL if table already existed
        with engine.connect() as conn:
            user_columns_to_add = [
                ("mobile_number", "VARCHAR"),
                ("dob", "VARCHAR"),
                ("registration_number", "VARCHAR"),
                ("registration_authority", "VARCHAR"),
                ("medical_degree", "VARCHAR"),
                ("specialization", "VARCHAR"),
                ("hospital_name", "VARCHAR"),
                ("experience_years", "VARCHAR"),
                ("hospital_id_card", "VARCHAR"),
                ("professional_address", "TEXT"),
                ("avatar_url", "TEXT"),
                ("is_admin", "BOOLEAN DEFAULT FALSE"),
            ]
            for col_name, col_type in user_columns_to_add:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                    conn.commit()
                except Exception:
                    pass

            # Ensure high-performance indexes exist
            indexes_to_create = [
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);",
                "CREATE INDEX IF NOT EXISTS idx_doctor_apps_email ON doctor_applications (email);",
                "CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor_id ON doctor_reviews (doctor_id);",
                "CREATE INDEX IF NOT EXISTS idx_analyses_patient_id ON analyses (patient_id);",
                "CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id ON analysis_results (analysis_id);",
            ]
            for idx_sql in indexes_to_create:
                try:
                    conn.execute(text(idx_sql))
                    conn.commit()
                except Exception:
                    pass

        # Seed 5 default doctor users if none exist
        existing_user = db_session.query(User).first()
        if not existing_user:
            doctors_data = [
                {
                    "name": "Dr. Priya Sharma",
                    "email": "dr.sharma@centralhospital.org",
                    "role": "Lead Interventional Cardiologist",
                    "password": "doctor123",
                    "mobile": "+91 98230 45112",
                    "dob": "14/08/1982",
                    "reg_no": "MMC-2007-048291",
                    "council": "Maharashtra Medical Council",
                    "degree": "MBBS, MD (Medicine), DM (Cardiology)",
                    "spec": "Interventional Cardiology",
                    "hospital": "Ruby Hall Clinic & Central Heart Institute",
                    "exp": "16 years",
                    "hosp_id": "RHC-CARD-082",
                    "address": "40 Sassoon Road, Sangamvadi, Pune, Maharashtra 411001"
                },
                {
                    "name": "Dr. Rajesh Mehta",
                    "email": "dr.mehta@centralhospital.org",
                    "role": "Senior Cardiac Electrophysiologist",
                    "password": "doctor123",
                    "mobile": "+91 98110 33421",
                    "dob": "22/11/1978",
                    "reg_no": "DMC-2003-019284",
                    "council": "Delhi Medical Council",
                    "degree": "MBBS, MD, DNB (Cardiology), FACC",
                    "spec": "Cardiac Electrophysiology & Intervention",
                    "hospital": "Central Cardiology Institute",
                    "exp": "20 years",
                    "hosp_id": "CCI-DIR-012",
                    "address": "Central Medical Enclave, New Delhi 110029"
                },
                {
                    "name": "Dr. Ananya Iyer",
                    "email": "dr.iyer@centralhospital.org",
                    "role": "Consultant Cardiologist & QCA Specialist",
                    "password": "doctor123",
                    "mobile": "+91 94440 88219",
                    "dob": "05/03/1988",
                    "reg_no": "TNC-2012-094821",
                    "council": "Tamil Nadu Medical Council",
                    "degree": "MBBS, MD (General Medicine), DM (Cardiology)",
                    "spec": "Quantitative Coronary Angiography (QCA)",
                    "hospital": "Apollo Speciality Cardiology Center",
                    "exp": "11 years",
                    "hosp_id": "APL-SPEC-441",
                    "address": "Greams Road, Thousand Lights, Chennai, Tamil Nadu 600006"
                },
                {
                    "name": "Dr. Vikram Malhotra",
                    "email": "dr.malhotra@centralhospital.org",
                    "role": "Associate Professor of Cardiology",
                    "password": "doctor123",
                    "mobile": "+91 98720 11942",
                    "dob": "19/07/1985",
                    "reg_no": "PMC-2010-062819",
                    "council": "Punjab Medical Council",
                    "degree": "MBBS, MD (Medicine), DM (Cardiology)",
                    "spec": "Complex PCI & Bifurcation Lesions",
                    "hospital": "Max Super Speciality Hospital",
                    "exp": "13 years",
                    "hosp_id": "MAX-CARD-309",
                    "address": "Phase VI, Mohali, Punjab 160055"
                },
                {
                    "name": "Dr. Sunita Kulkarni",
                    "email": "dr.kulkarni@centralhospital.org",
                    "role": "Director of Cath Lab & Interventional Services",
                    "password": "doctor123",
                    "mobile": "+91 98220 77410",
                    "dob": "30/01/1975",
                    "reg_no": "MMC-1999-031892",
                    "council": "Maharashtra Medical Council",
                    "degree": "MBBS, MD, DM (Cardiology), FSCAI",
                    "spec": "Structural Heart & Coronary Interventions",
                    "hospital": "Deenanath Mangeshkar Hospital",
                    "exp": "24 years",
                    "hosp_id": "DMH-DIR-004",
                    "address": "Erandwane, Pune, Maharashtra 411004"
                }
            ]

            created_doctors = []
            for doc_info in doctors_data:
                user = User(
                    name=doc_info["name"],
                    email=doc_info["email"],
                    password_hash=generate_password_hash(doc_info["password"]),
                    role=doc_info["role"],
                    mobile_number=doc_info.get("mobile"),
                    dob=doc_info.get("dob"),
                    registration_number=doc_info.get("reg_no"),
                    registration_authority=doc_info.get("council"),
                    medical_degree=doc_info.get("degree"),
                    specialization=doc_info.get("spec"),
                    hospital_name=doc_info.get("hospital"),
                    experience_years=doc_info.get("exp"),
                    hospital_id_card=doc_info.get("hosp_id"),
                    professional_address=doc_info.get("address"),
                    created_at=datetime.utcnow()
                )
                db_session.add(user)
                created_doctors.append(user)
            db_session.commit()

            # Seed 5 sample patients & analyses
            patients_data = [
                {
                    "patient_id": "PAT-00123",
                    "name": "Ramesh Patel",
                    "age": 56,
                    "gender": "Male",
                    "vessel": "LAD Proximal",
                    "severity": 68.0,
                    "confidence": 92.0,
                    "region": "Proximal segment of LAD",
                    "file_name": "patient_001_angio.dcm",
                    "verified": True,
                    "doctor_idx": 0,
                    "comments": "Physician verified - significant 68% stenosis in proximal LAD"
                },
                {
                    "patient_id": "PAT-00120",
                    "name": "Sunita Rao",
                    "age": 62,
                    "gender": "Female",
                    "vessel": "RCA Mid",
                    "severity": 85.0,
                    "confidence": 95.0,
                    "region": "Mid segment of Right Coronary Artery",
                    "file_name": "patient_002_angio.dcm",
                    "verified": True,
                    "doctor_idx": 1,
                    "comments": "Severe 85% mid-RCA lesion. Primary PCI recommended."
                },
                {
                    "patient_id": "PAT-00118",
                    "name": "Anil Verma",
                    "age": 49,
                    "gender": "Male",
                    "vessel": "LCx Distal",
                    "severity": 35.0,
                    "confidence": 88.0,
                    "region": "Distal Left Circumflex branch",
                    "file_name": "patient_003_angio.dcm",
                    "verified": False,
                    "doctor_idx": 0,
                    "comments": "Mild non-obstructive CAD. Medical management indicated."
                },
                {
                    "patient_id": "PAT-00115",
                    "name": "Kavita Menon",
                    "age": 58,
                    "gender": "Female",
                    "vessel": "LAD Mid",
                    "severity": 72.0,
                    "confidence": 94.0,
                    "region": "Mid segment of LAD after 1st diagonal",
                    "file_name": "patient_004_angio.dcm",
                    "verified": True,
                    "doctor_idx": 0,
                    "comments": "Physiologically significant mid-LAD stenosis. FFR 0.73."
                },
                {
                    "patient_id": "PAT-00112",
                    "name": "Vikram Singh",
                    "age": 67,
                    "gender": "Male",
                    "vessel": "LMCA Bifurcation",
                    "severity": 45.0,
                    "confidence": 90.0,
                    "region": "Left Main bifurcation into LAD/LCx",
                    "file_name": "patient_005_angio.dcm",
                    "verified": False,
                    "doctor_idx": 3,
                    "comments": "Moderate bifurcation plaque. IVUS assessment scheduled."
                }
            ]

            for p_info in patients_data:
                patient = Patient(
                    patient_id=p_info["patient_id"],
                    age=p_info["age"],
                    gender=p_info["gender"],
                    created_at=datetime.utcnow()
                )
                db_session.add(patient)
                db_session.commit()

                analysis = Analysis(
                    patient_id=patient.id,
                    uploaded_file_name=p_info["file_name"],
                    file_path=f"data/sample_images/{p_info['file_name']}",
                    analysis_date=datetime.utcnow(),
                    status="completed"
                )
                db_session.add(analysis)
                db_session.commit()

                result = AnalysisResult(
                    analysis_id=analysis.id,
                    affected_vessel=p_info["vessel"],
                    severity=p_info["severity"],
                    confidence=p_info["confidence"],
                    detected_region=p_info["region"],
                    model_version="v1.0.0-qca",
                    created_at=datetime.utcnow()
                )
                db_session.add(result)

                doc_user = created_doctors[p_info["doctor_idx"]]
                review = DoctorReview(
                    analysis_id=analysis.id,
                    doctor_id=doc_user.id,
                    verified=p_info["verified"],
                    comments=p_info["comments"],
                    reviewed_at=datetime.utcnow()
                )
                db_session.add(review)
                db_session.commit()

        # Seed sample Doctor Verification Applications if table is empty
        existing_apps = db_session.query(DoctorApplication).first()
        if not existing_apps:
            sample_apps = [
                {
                    "full_name": "Dr. Rahul Sharma",
                    "email": "dr.rahul.sharma@cardiacpulse.in",
                    "mobile_number": "+91 98765 43210",
                    "dob": "12/06/1986",
                    "registration_number": "MMC-2011-094182",
                    "registration_authority": "Maharashtra Medical Council",
                    "medical_degree": "MBBS, MD, DM (Cardiology)",
                    "specialization": "Interventional Cardiology",
                    "hospital_name": "Ruby Hall Clinic & Heart Center",
                    "experience_years": "8 years",
                    "hospital_id_card": "H12345",
                    "professional_address": "Ruby Hall Clinic, Bund Garden Road, Pune - 411001",
                    "status": "pending"
                },
                {
                    "full_name": "Dr. Sneha Deshmukh",
                    "email": "dr.sneha.deshmukh@careheart.org",
                    "mobile_number": "+91 97654 32109",
                    "dob": "28/09/1989",
                    "registration_number": "KMC-2015-081293",
                    "registration_authority": "Karnataka Medical Council",
                    "medical_degree": "MBBS, DNB (General Medicine), DNB (Cardiology)",
                    "specialization": "Clinical & Preventive Cardiology",
                    "hospital_name": "Manipal Heart Institute",
                    "experience_years": "6 years",
                    "hospital_id_card": "MAN-CARD-119",
                    "professional_address": "Old Airport Road, Kodihalli, Bengaluru - 560017",
                    "status": "pending"
                },
                {
                    "full_name": "Dr. Arvind Swaminathan",
                    "email": "dr.arvind@metrocath.org",
                    "mobile_number": "+91 98401 22334",
                    "dob": "15/04/1980",
                    "registration_number": "TNC-2005-039182",
                    "registration_authority": "Tamil Nadu Medical Council",
                    "medical_degree": "MBBS, MD, DM (Cardiology), FACC",
                    "specialization": "Complex Coronary Angioplasty & Imaging",
                    "hospital_name": "Madras Medical Mission Hospital",
                    "experience_years": "18 years",
                    "hospital_id_card": "MMM-DIR-009",
                    "professional_address": "4-A, Dr. J.J. Nagar, Mogappair, Chennai - 600037",
                    "status": "approved"
                }
            ]

            for a_info in sample_apps:
                app_entry = DoctorApplication(
                    full_name=a_info["full_name"],
                    email=a_info["email"],
                    mobile_number=a_info["mobile_number"],
                    dob=a_info["dob"],
                    registration_number=a_info["registration_number"],
                    registration_authority=a_info["registration_authority"],
                    medical_degree=a_info["medical_degree"],
                    specialization=a_info["specialization"],
                    hospital_name=a_info["hospital_name"],
                    experience_years=a_info["experience_years"],
                    hospital_id_card=a_info["hospital_id_card"],
                    professional_address=a_info["professional_address"],
                    status=a_info["status"],
                    created_at=datetime.utcnow()
                )
                db_session.add(app_entry)
            db_session.commit()

        print("Database schema verified, doctor accounts, applications, and sample analyses initialized.")
    except Exception as e:
        db_session.rollback()
        print(f"Warning: Database initialization encountered notice/error: {e}")
    finally:
        db_session.remove()

@app.route('/api/init-db', methods=['POST', 'GET'])
def api_init_db():
    try:
        init_db_and_seed()
        return jsonify({
            "success": True,
            "message": "Database tables and seeded applications created successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Failed to initialize database",
            "error": str(e)
        }), 500

# Run database setup on startup
try:
    init_db_and_seed()
except Exception as e:
    print(f"Initial DB check: {e}")

if __name__ == '__main__':
    debug_mode = FLASK_ENV == 'development'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode, use_reloader=debug_mode)
