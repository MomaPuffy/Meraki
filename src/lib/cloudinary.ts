import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const uploadImage = async (base64Image: string, folder: string = 'attendance') => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'image',
      type: 'private', // Make images private
      transformation: [
        { width: 400, height: 400, crop: 'fill' },
        { quality: 'auto' },
        { format: 'jpg' }
      ]
    });
    
    // Generate signed URLs for private access
    const signedUrl = cloudinary.url(result.public_id, {
      type: 'private',
      sign_url: true,
      secure: true
    });
    
    const signedThumbnail = cloudinary.url(result.public_id, {
      type: 'private',
      sign_url: true,
      secure: true,
      transformation: [
        { width: 150, height: 150, crop: 'fill' }
      ]
    });
    
    return {
      url: signedUrl,
      public_id: result.public_id,
      thumbnail: signedThumbnail
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Generate signed URLs for private images
export const getSignedImageUrl = (publicId: string, transformation?: object) => {
  return cloudinary.url(publicId, {
    type: 'private',
    sign_url: true,
    secure: true,
    transformation: transformation
  });
};

// Generate signed thumbnail URL
export const getSignedThumbnailUrl = (publicId: string) => {
  return cloudinary.url(publicId, {
    type: 'private',
    sign_url: true,
    secure: true,
    transformation: [
      { width: 150, height: 150, crop: 'fill' }
    ]
  });
};
