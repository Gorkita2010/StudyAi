
export const downloadFile = (content: string | Blob, filename: string, mimeType: string) => {
    let blob: Blob;
    
    if (typeof content === 'string') {
        blob = new Blob([content], { type: mimeType });
    } else {
        blob = content;
    }

    // Create a link element
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
