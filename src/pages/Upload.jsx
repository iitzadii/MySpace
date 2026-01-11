
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CloudInhery from "../api/cloudinhery";
import { Upload as UploadIcon, X, Check, FileImage } from "lucide-react";

const Upload = () => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (file) => {
        if (file.type.startsWith("image/")) {
            setFile(file);
        } else {
            alert("Please upload an image file");
        }
    };

    const clearFile = () => {
        setFile(null);
        setProgress(0);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);

        // Simulate progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 100);

        try {
            const result = await CloudInhery.uploadImage(file);
            clearInterval(interval);
            setProgress(100);

            // Construct new image object for immediate display
            const newImage = {
                id: result.public_id,
                url: result.secure_url,
                name: result.public_id,
                uploadedAt: result.created_at,
                size: result.bytes
            };

            // Store in session storage so Dashboard picks it up immediately
            const pending = JSON.parse(sessionStorage.getItem('temp_uploaded_images') || '[]');
            sessionStorage.setItem('temp_uploaded_images', JSON.stringify([newImage, ...pending]));

            // Short delay to show 100%
            setTimeout(() => {
                navigate("/dashboard");
            }, 500);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
            setUploading(false);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Upload Image</h1>
                <p>Add new memories to your gallery</p>
            </header>

            <div className="upload-container">
                {!file ? (
                    <div
                        className={`drop-zone ${dragActive ? "active" : ""}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            className="file-input"
                            onChange={handleChange}
                            accept="image/*"
                        />
                        <div className="drop-content">
                            <div className="icon-circle">
                                <UploadIcon size={32} />
                            </div>
                            <h3>Click to upload or drag and drop</h3>
                            <p>SVG, PNG, JPG or GIF (max. 800x400px)</p>
                        </div>
                    </div>
                ) : (
                    <div className="file-preview-card">
                        <div className="file-info">
                            <div className="file-icon">
                                <FileImage size={24} />
                            </div>
                            <div className="file-details">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                            {!uploading && (
                                <button onClick={clearFile} className="remove-button">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        {uploading ? (
                            <div className="upload-progress">
                                <div className="progress-bar-bg">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <span className="progress-text">
                                    {progress === 100 ? "Complete!" : `Uploading... ${progress}%`}
                                </span>
                            </div>
                        ) : (
                            <button onClick={handleUpload} className="upload-button">
                                Upload Image
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Upload;
