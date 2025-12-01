
export function captureVideoFrame(video: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    const scale = 1;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const canvasContext = canvas.getContext('2d')!;
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

export function bindMediaStream(node: HTMLVideoElement, media: MediaStream) {
    node.srcObject = media;
};
