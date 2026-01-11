
import { useState, useEffect } from "react";
import CloudInhery from "../api/cloudinhery";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchImages();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showNotification = (message, type = 'success') => {
        setToast({ message, type });
    };

    const fetchImages = async () => {
        try {
            const apiData = await CloudInhery.getImages();

            // Merge with pending uploads from session storage
            const pendingParams = sessionStorage.getItem('temp_uploaded_images');
            let pendingImages = [];
            if (pendingParams) {
                pendingImages = JSON.parse(pendingParams);
            }

            // Combine and deduplicate (prefer API data if available, but keep pending at top)
            // Use a Map to deduplicate by ID
            const imageMap = new Map();

            // Add pending first (so they are newer/top)
            pendingImages.forEach(img => imageMap.set(img.id, img));

            // Add API data (will overwrite pending if ID matches, confirming it's now on server)
            // BUT wait, we want pending to stay if API doesn't have it yet.
            // Actually, if API has it, we should use API data as truth, but if API *doesn't* have it (cache lag), we use pending.
            // So: Put API data in Map. Then add Pending if not present?
            // No, we want Pending to be displayed *until* API has it.
            // The issue is if API returns OLD list, it won't have new image.

            apiData.forEach(img => imageMap.set(img.id, img));

            // If API didn't return a pending image, ensure it's still there
            // Also, if API *DID* return it, we can remove it from pending (cleanup)
            const remainingPending = [];
            pendingImages.forEach(img => {
                if (!imageMap.has(img.id)) {
                    imageMap.set(img.id, img);
                    remainingPending.push(img);
                }
            });

            // Cleanup: If we found pending images that are now in the API, remove them from storage
            if (pendingImages.length !== remainingPending.length) {
                sessionStorage.setItem('temp_uploaded_images', JSON.stringify(remainingPending));
            }

            // Convert back to array and sort by date descending
            const merged = Array.from(imageMap.values()).sort((a, b) =>
                new Date(b.uploadedAt) - new Date(a.uploadedAt)
            );

            setImages(merged);
        } catch (error) {
            console.error("Failed to load images", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedImage) return;

        // Optimistic Update: Remove immediately
        const prevImages = [...images];
        setImages(images.filter(img => img.id !== selectedImage.id));
        setShowDeleteConfirm(false);

        // Also remove from session storage if it was a pending upload
        const pending = JSON.parse(sessionStorage.getItem('temp_uploaded_images') || '[]');
        const newPending = pending.filter(img => img.id !== selectedImage.id);
        if (pending.length !== newPending.length) {
            sessionStorage.setItem('temp_uploaded_images', JSON.stringify(newPending));
        }

        const imageToDelete = selectedImage; // Store ref
        setSelectedImage(null); // Close modal 

        try {
            await CloudInhery.deleteImage(imageToDelete.id);
            showNotification(`"${imageToDelete.name}" deleted successfully`, 'success');
            // We don't need to refetch immediately because we already updated UI
            // But we can refetch silently to sync up
            // fetchImages(); 
        } catch (e) {
            // Revert on failure
            setImages(prevImages);
            showNotification('Failed to delete image', 'error');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <Loader2 className="spinner" size={32} />
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Toast Notification */}
            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.message}
                </div>
            )}

            <header className="page-header">
                <h1>My Gallery</h1>
                <p>{images.length} images stored</p>
            </header>

            {images.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-illustration">🖼️</div>
                    <h3>No images yet</h3>
                    <p>Upload your first image to get started</p>
                </div>
            ) : (
                <div className="image-grid">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="image-card"
                            onClick={() => setSelectedImage(img)}
                        >
                            <div className="image-wrapper">
                                <img src={img.url} alt={img.name} loading="lazy" />
                            </div>
                            <div className="image-info">
                                <span className="image-name">{img.name}</span>
                                <span className="image-date">
                                    {new Date(img.uploadedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedImage(null)}>×</button>

                        {/* Navigation Arrows */}
                        <button
                            className="nav-arrow left"
                            onClick={(e) => {
                                e.stopPropagation();
                                const currentIndex = images.findIndex(img => img.id === selectedImage.id);
                                const prevIndex = (currentIndex - 1 + images.length) % images.length;
                                setSelectedImage(images[prevIndex]);
                            }}
                        >
                            ‹
                        </button>

                        <button
                            className="nav-arrow right"
                            onClick={(e) => {
                                e.stopPropagation();
                                const currentIndex = images.findIndex(img => img.id === selectedImage.id);
                                const nextIndex = (currentIndex + 1) % images.length;
                                setSelectedImage(images[nextIndex]);
                            }}
                        >
                            ›
                        </button>

                        <img src={selectedImage.url} alt={selectedImage.name} />

                        <div className="modal-footer">
                            <h3>{selectedImage.name}</h3>
                            <div className="modal-actions">
                                <span className="image-date">{new Date(selectedImage.uploadedAt).toLocaleString()}</span>

                                <button
                                    className="action-button copy-button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedImage.url);
                                        showNotification("Link copied to clipboard!");
                                    }}
                                >
                                    🔗 Copy Link
                                </button>

                                <button
                                    className="action-button delete-button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay confirm-overlay">
                    <div className="confirm-modal">
                        <h3>Delete Image?</h3>
                        <p>Are you sure you want to delete <b>{selectedImage?.name}</b>?</p>
                        <p className="confirm-warning">This action cannot be undone.</p>
                        <div className="confirm-actions">
                            <button
                                className="action-button cancel-button"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="action-button delete-confirm-button"
                                onClick={handleDelete}
                            >
                                Yes, Delete it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
