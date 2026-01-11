
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, Upload as UploadIcon, Image as ImageIcon } from "lucide-react";

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-brand">
                    <div className="brand-logo">My</div>
                    <span>Space</span>
                </Link>

                <div className="navbar-links">
                    <Link
                        to="/dashboard"
                        className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    >
                        <ImageIcon size={18} />
                        <span>Gallery</span>
                    </Link>

                    <Link
                        to="/upload"
                        className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}
                    >
                        <UploadIcon size={18} />
                        <span>Upload</span>
                    </Link>

                    <div className="nav-divider"></div>

                    <div className="user-menu">
                        <span className="user-name">{user.name}</span>
                        <button onClick={logout} className="logout-button" title="Sign out">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
