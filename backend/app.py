import os
import urllib.parse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
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

# 1. Load environment variables from root .env
root_env = Path(__file__).resolve().parent.parent / '.env'
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
else:
    load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "angiolens_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
FLASK_ENV = os.getenv("FLASK_ENV", "development")
SECRET_KEY = os.getenv("SECRET_KEY", "default-dev-secret-key")

# 2. Database Connection URL (safely encode special characters in password)
encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine and scoped session
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)
SessionFactory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
db_session = scoped_session(SessionFactory)

# 3. SQLAlchemy Models mapping existing PostgreSQL tables
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
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

# 4. Initialize Flask Application
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY

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

# 5. Helper Functions
def format_analysis_data(analysis):
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

# 6. API Endpoints

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
        # Return sanitized error message without leaking credentials
        return jsonify({
            "success": False,
            "message": "Database connection failed",
            "error_type": type(e).__name__
        }), 500

# ----------------- Authentication -----------------

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

        # Check existing user
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
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        user = db_session.query(User).filter_by(email=email).first()
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

@app.route('/api/profile', methods=['GET'])
@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_profile(user_id=None):
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

# ----------------- Patients -----------------

@app.route('/api/patients', methods=['POST'])
def save_patient():
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id') or data.get('patientId') or 'PAT-00123'
        patient_id = str(patient_id).strip()
        age = data.get('age')
        gender = data.get('gender', 'Male')

        if not patient_id:
            return jsonify({
                "success": False,
                "message": "Patient ID is required"
            }), 400

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
        return jsonify({
            "success": False,
            "message": "Failed to save patient",
            "error_type": type(e).__name__
        }), 500

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

        # 1. Resolve or create Patient
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

        # 2. Create Analysis record
        analysis = Analysis(
            patient_id=patient.id,
            uploaded_file_name=file_name,
            file_path=file_path,
            analysis_date=datetime.utcnow(),
            status='completed'
        )
        db_session.add(analysis)
        db_session.commit()

        # 3. Create AI Analysis Results record
        # In accordance with Part 7, preserve existing mock values and persist to PostgreSQL
        affected_vessel = data.get('affected_vessel', 'LAD Proximal')
        severity = data.get('severity', 68.00)
        confidence = data.get('confidence', 92.00)
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
        db_session.commit()

        return jsonify({
            "success": True,
            "message": "Analysis created and processed successfully",
            "analysis_id": analysis.id,
            "patient": patient.to_dict(),
            "analysis": analysis.to_dict(),
            "result": analysis_result.to_dict()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create analysis",
            "error_type": type(e).__name__
        }), 500

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

        # Check analysis exists
        analysis = db_session.query(Analysis).filter_by(id=analysis_id).first()
        if not analysis:
            return jsonify({"success": False, "message": "Analysis not found"}), 404

        # Check doctor exists; if not provided or doesn't exist, use the first doctor or create default doctor
        doctor = None
        if doctor_id:
            doctor = db_session.query(User).filter_by(id=int(doctor_id)).first()
        if not doctor:
            doctor = db_session.query(User).first()
        if not doctor:
            doctor = User(
                name="Dr. Priya Sharma",
                email="dr.sharma@centralhospital.org",
                password_hash=generate_password_hash("defaultpass123"),
                role="doctor",
                created_at=datetime.utcnow()
            )
            db_session.add(doctor)
            db_session.commit()

        # Check if a review already exists for this analysis and doctor
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

        doctor_name = "Dr. Sharma, MD, FACC"
        if review and review.get('doctor_id'):
            doc = db_session.query(User).filter_by(id=review['doctor_id']).first()
            if doc:
                doctor_name = doc.name

        report = {
            "report_num": f"REPORT #ANG-2026-{analysis.id:04d}",
            "date": analysis.analysis_date.strftime('%B %d, %Y') if analysis.analysis_date else 'September 21, 2026',
            "patient_id": patient.get('patient_id', 'PAT-00123'),
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

if __name__ == '__main__':
    debug_mode = FLASK_ENV == 'development'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
