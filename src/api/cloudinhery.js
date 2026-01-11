
import CryptoJS from "crypto-js";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.VITE_CLOUDINARY_API_SECRET;
const AUTH_EMAIL = import.meta.env.VITE_AUTH_EMAIL;
const AUTH_PASSWORD = import.meta.env.VITE_AUTH_PASSWORD;

const CloudInhery = {
  // --- Auth (Still Mocked) ---
  login: async (email, password) => {
    await new Promise(r => setTimeout(r, 800));

    if (!email || !password) throw new Error("Credentials required");

    // Validate against .env credentials
    if (email !== AUTH_EMAIL || password !== AUTH_PASSWORD) {
      throw new Error("Invalid email or password");
    }

    const user = { id: "usr_1", email, name: email.split("@")[0] };
    const token = "tok_123";
    sessionStorage.setItem("cloudinhery_user", JSON.stringify(user));
    return { user, token };
  },

  logout: async () => {
    sessionStorage.removeItem("cloudinhery_user");
  },

  getCurrentUser: () => {
    const u = sessionStorage.getItem("cloudinhery_user");
    return u ? JSON.parse(u) : null;
  },

  // --- Real Cloudinary Logic ---

  /**
   * Upload Image
   * Now adds a 'cloudinhery_gallery' tag so we can fetch it later.
   */
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("tags", "cloudinhery_gallery"); // Tag for fetching

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },

  /**
   * Get Images (Client-Side)
   * We must use the JSON List method because the Admin API 
   * blocks CORS (browser access) for security reasons.
   */
  getImages: async () => {
    try {
      // Add a timestamp to bust cache
      const timestamp = new Date().getTime();
      const res = await fetch(
        `https://res.cloudinary.com/${CLOUD_NAME}/image/list/cloudinhery_gallery.json?t=${timestamp}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          console.warn("Resource list not found. Ensure 'Resource list' is enabled and images are tagged 'cloudinhery_gallery'.");
          return [];
        }
        throw new Error("Failed to fetch image list");
      }

      const data = await res.json();

      return data.resources.map(img => ({
        id: img.public_id,
        // Construct standard URL
        url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v${img.version}/${img.public_id}.${img.format}`,
        name: img.public_id,
        uploadedAt: img.created_at,
        size: 0
      }));

    } catch (e) {
      console.error("Fetch error:", e);
      return [];
    }
  },

  /**
   * Delete Image
   * Requires a Signature generated with API Secret.
   */
  deleteImage: async (publicId) => {
    const timestamp = Math.round((new Date()).getTime() / 1000);

    // 1. Generate Signature
    // Signature rules: parameters (sorted alphabetically) + api_secret, then SHA-1
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = CryptoJS.SHA1(paramsToSign).toString();

    // 2. Send Destroy Request
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("api_key", API_KEY);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  }
};

export default CloudInhery;