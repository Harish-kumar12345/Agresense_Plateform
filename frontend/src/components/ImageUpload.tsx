import React, { useRef, useState } from 'react';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { CameraCapture } from './CameraCapture';

interface ImageUploadProps {
  onImageUpload: (imageData: string, fileName: string) => void;
  isUploading: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, isUploading }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showCameraError, setShowCameraError] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WEBP).');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please upload a smaller photo.');
      event.target.value = '';
      return;
    }

    processImage(file);
    event.target.value = '';
  };

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      onImageUpload(imageData, file.name);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraCapture = async () => {
    setShowCameraError(false);
    
    // Check if camera is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setShowCameraModal(true);
    } else {
      // Fallback for browsers without getUserMedia support
      setShowCameraError(true);
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 100);
    }
  };

  const handleCameraCapture = (imageData: string, fileName: string) => {
    onImageUpload(imageData, fileName);
  };

  const handleCameraError = (error: string) => {
    setShowCameraError(true);
    console.error('Camera error:', error);
    // Fallback to file input with capture attribute
    setTimeout(() => {
      cameraInputRef.current?.click();
    }, 100);
  };

  const closeCameraModal = () => {
    setShowCameraModal(false);
  };

  return (
    <>
      <div className="relative flex items-center gap-2">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
          multiple={false}
        />

        {/* Camera Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={triggerCameraCapture}
          disabled={isUploading}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          title={t('chat.take_photo')}
        >
          <Camera className="w-5 h-5" />
        </motion.button>

        {/* Upload Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={triggerFileUpload}
          disabled={isUploading}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-sky-400 border border-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          title={t('chat.upload_image')}
        >
          <Upload className="w-5 h-5" />
        </motion.button>

        {isUploading && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span>{t('chat.analyzing_image')}</span>
          </div>
        )}
        
        {showCameraError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-1.5 whitespace-nowrap z-10 shadow-lg"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('chat.camera_error')}</span>
          </motion.div>
        )}

        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-1.5 whitespace-nowrap z-10 shadow-lg"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{uploadError}</span>
          </motion.div>
        )}
      </div>

      {/* Camera Modal */}
      <CameraCapture
        isOpen={showCameraModal}
        onClose={closeCameraModal}
        onImageCapture={handleCameraCapture}
        onError={handleCameraError}
      />
    </>
  );
};