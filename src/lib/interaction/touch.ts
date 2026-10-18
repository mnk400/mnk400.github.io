// Touch gets no highlight (docs/style-dna.md "Interaction grammar"): a press
// shows through :active alone. iOS Safari only applies :active on a page that
// listens for touchstart, so this empty listener keeps the press scales working.
document.addEventListener('touchstart', () => {}, { passive: true });
