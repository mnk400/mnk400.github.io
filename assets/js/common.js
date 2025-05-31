document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('image-input');
    const uploadBtn = document.getElementById('upload-btn');

    // Listen to handle upload button clicks
    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });
});