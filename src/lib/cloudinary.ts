export const uploadToCloudinary = async (imageUri: string): Promise<string> => {
  try {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary credentials not configured");
    }

    const data = new FormData();
    data.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "upload.jpg"
    } as any);
    data.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "multipart/form-data",
        }
      }
    );

    const json = await response.json();
    if (json.secure_url) {
      return json.secure_url;
    } else {
      throw new Error("Upload failed: No secure_url in response");
    }
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};
