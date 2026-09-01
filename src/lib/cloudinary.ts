import * as FileSystem from 'expo-file-system/legacy';

export const uploadToCloudinary = async (imageUri: string): Promise<string> => {
  try {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary credentials not configured");
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    // expo-file-system handles multipart/form-data efficiently without the FormData fetch bugs
    const response = await FileSystem.uploadAsync(url, imageUri, {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      parameters: {
        upload_preset: uploadPreset,
      },
    });

    const json = JSON.parse(response.body);
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
