export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const downloadBase64Data = (base64Data: string, fileName: string) => {
  try {
    // If it's a regular URL (http/https), just open it
    if (base64Data.startsWith('http')) {
      window.open(base64Data, '_blank');
      return;
    }

    // Check if it's a data URL
    if (!base64Data.startsWith('data:')) {
      console.error('Invalid base64 data');
      return;
    }

    // Split metadata and data
    const [metadata, data] = base64Data.split(',');
    const mimeType = metadata.match(/:(.*?);/)?.[1] || 'application/octet-stream';
    
    // Decode Base64
    const byteCharacters = atob(data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // Create Blob and trigger download
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download file. The file data might be corrupted.');
  }
};