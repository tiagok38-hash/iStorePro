import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon, CheckIcon, ArrowPathRoundedSquareIcon } from './icons.tsx';
import { SpinnerIcon } from './icons.tsx';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageData: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        stopCamera();
        setLoading(true);
        setError(null);
        setCapturedImage(null);

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Ensure we wait a tick to allow previous tracks to fully stop
                await new Promise(resolve => setTimeout(resolve, 100));

                const streamData = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                });

                streamRef.current = streamData;

                if (videoRef.current) {
                    videoRef.current.srcObject = streamData;
                }
            } else {
                setError('A câmera não é suportada neste navegador.');
            }
        } catch (err: any) {
            console.error('Erro ao acessar camera:', err);
            // Handle specific errors
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Permissão da câmera negada. Habilite nas configurações do navegador.');
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setError('Nenhuma câmera encontrada.');
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setError('A câmera está sendo usada por outro aplicativo.');
            } else {
                setError('Erro ao acessar a câmera. Tente recarregar a página.');
            }
        } finally {
            setLoading(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, startCamera, stopCamera]);

    // Ensure video is attached if ref becomes available later (rare but possible)
    useEffect(() => {
        if (isOpen && !loading && !capturedImage && videoRef.current && streamRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isOpen, loading, capturedImage]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Limit max dimension to 800px
                const MAX_DIMENSION = 800;
                let width = video.videoWidth;
                let height = video.videoHeight;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext('2d');
                if (context) {
                    context.drawImage(video, 0, 0, width, height);
                    // Use JPEG with 0.7 quality for compression
                    const imageData = canvas.toDataURL('image/jpeg', 0.7);
                    setCapturedImage(imageData);
                    stopCamera(); // Stop stream to save resources/battery
                }
            }
        }
    };

    const handleRetake = () => {
        startCamera();
    };

    const handleUsePhoto = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[80]" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h3 className="text-lg font-bold text-primary">Tirar foto</h3>
                </div>
                <div className="p-4 flex-1 flex items-center justify-center bg-black min-h-[300px] overflow-hidden rounded-md m-4 relative">
                    {error && <div className="text-center text-danger p-4 z-10 font-bold bg-white/90 rounded-md">{error}</div>}
                    {loading && !error && <div className="z-10"><SpinnerIcon /></div>}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover absolute inset-0 ${capturedImage || loading ? 'invisible' : 'visible'}`}
                    ></video>

                    <canvas ref={canvasRef} className="hidden"></canvas>

                    {capturedImage && (
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-cover absolute inset-0" />
                    )}
                </div>
                <div className="p-4 flex justify-center items-center gap-4 border-t">
                    {!capturedImage ? (
                        <button onClick={handleCapture} disabled={loading || !!error} className="p-4 bg-primary text-white rounded-full disabled:bg-muted hover:scale-105 transition-transform shadow-lg">
                            <CameraIcon className="h-6 w-6" />
                        </button>
                    ) : (
                        <>
                            <button onClick={handleRetake} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-secondary rounded-md hover:bg-gray-300 transition-colors">
                                <ArrowPathRoundedSquareIcon className="h-5 w-5" /> Tirar outra
                            </button>
                            <button onClick={handleUsePhoto} className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors shadow-md">
                                <CheckIcon className="h-5 w-5" /> Usar foto
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraModal;