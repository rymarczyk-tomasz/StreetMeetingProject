document.addEventListener("DOMContentLoaded", () => {
  try {
    document
      .querySelectorAll("img:not([decoding])")
      .forEach((img) => (img.decoding = "async"));
  } catch (e) {
    console.warn("set-image-decoding failed", e);
  }
});
