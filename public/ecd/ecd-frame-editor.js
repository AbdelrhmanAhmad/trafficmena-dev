/**
 * ECommerce Day attending-frame editor (Facebook-style photo frame).
 * Frame asset: transparent hole at (218,450) 640×554 on 1080×1350 canvas.
 *
 * Usage (HTML):
 *   EcdFrameEditor.mount({
 *     root: el,
 *     frameSrc: "assets/attendee-frame.png",
 *     existingUrl: data.attendeeFrameUrl || "",
 *     onConfirm: async (dataUrl) => { await EcdApi.uploadAttendeeFrame(...) }
 *   });
 *
 * Usage (React): import helpers via window.EcdFrameEditor or shared component.
 */
(function (global) {
  "use strict";

  var FRAME_W = 1080;
  var FRAME_H = 1350;
  var HOLE = { x: 218, y: 450, w: 640, h: 554, r: 48 };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("Could not load image"));
      };
      img.src = src;
    });
  }

  function coverScale(imgW, imgH, holeW, holeH) {
    return Math.max(holeW / imgW, holeH / imgH);
  }

  /**
   * Draw photo (cover + pan/zoom) then frame overlay into canvas.
   * state: { img, scale, ox, oy } where ox/oy are photo center offsets in hole space.
   */
  function renderComposite(canvas, frameImg, state) {
    var ctx = canvas.getContext("2d");
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);

    if (state && state.img) {
      var base = coverScale(state.img.width, state.img.height, HOLE.w, HOLE.h);
      var scale = base * (state.scale || 1);
      var drawW = state.img.width * scale;
      var drawH = state.img.height * scale;
      var cx = HOLE.x + HOLE.w / 2 + (state.ox || 0);
      var cy = HOLE.y + HOLE.h / 2 + (state.oy || 0);

      ctx.save();
      roundRectPath(ctx, HOLE.x, HOLE.y, HOLE.w, HOLE.h, HOLE.r);
      ctx.clip();
      ctx.drawImage(state.img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      ctx.restore();
    }

    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, FRAME_W, FRAME_H);
    }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function mount(opts) {
    var root = opts.root;
    if (!root) throw new Error("EcdFrameEditor.mount: root required");
    var frameSrc = opts.frameSrc || "assets/attendee-frame.png";
    var onConfirm = opts.onConfirm || function () {};
    var existingUrl = opts.existingUrl || "";

    root.innerHTML =
      '<div class="ecd-frame-editor">' +
      '<div class="ecd-frame-preview-wrap">' +
      '<canvas class="ecd-frame-canvas" aria-label="Attending photo preview"></canvas>' +
      "</div>" +
      '<div class="ecd-frame-controls">' +
      '<label class="ecd-frame-upload-btn">' +
      '<input type="file" accept="image/jpeg,image/png,image/webp" class="ecd-frame-file" hidden />' +
      "Choose photo" +
      "</label>" +
      '<label class="ecd-frame-zoom-label">Zoom' +
      '<input type="range" class="ecd-frame-zoom" min="100" max="250" value="100" disabled />' +
      "</label>" +
      '<p class="ecd-frame-hint">Drag the photo to position it inside the frame.</p>' +
      '<div class="ecd-frame-actions">' +
      '<button type="button" class="ecd-frame-confirm" disabled>Confirm &amp; save</button>' +
      '<a class="ecd-frame-download btn-link" style="display:none" download="ecommerce-day-2026-attending.png">Download</a>' +
      "</div>" +
      '<p class="ecd-frame-status" aria-live="polite"></p>' +
      "</div>" +
      "</div>";

    var canvas = root.querySelector(".ecd-frame-canvas");
    var fileInput = root.querySelector(".ecd-frame-file");
    var zoom = root.querySelector(".ecd-frame-zoom");
    var confirmBtn = root.querySelector(".ecd-frame-confirm");
    var downloadLink = root.querySelector(".ecd-frame-download");
    var statusEl = root.querySelector(".ecd-frame-status");

    var frameImg = null;
    var state = { img: null, scale: 1, ox: 0, oy: 0 };
    var dragging = false;
    var lastX = 0;
    var lastY = 0;

    function setStatus(msg, isError) {
      statusEl.textContent = msg || "";
      statusEl.style.color = isError ? "#b3362e" : "#6b747e";
    }

    function redraw() {
      renderComposite(canvas, frameImg, state);
      // Display size
      canvas.style.width = "100%";
      canvas.style.maxWidth = "360px";
      canvas.style.height = "auto";
      canvas.style.touchAction = "none";
      canvas.style.cursor = state.img ? "grab" : "default";
    }

    function syncDownload(url) {
      if (url) {
        downloadLink.href = url;
        downloadLink.style.display = "";
      } else {
        downloadLink.style.display = "none";
      }
    }

    loadImage(frameSrc)
      .then(function (img) {
        frameImg = img;
        redraw();
        if (existingUrl) {
          syncDownload(existingUrl);
          setStatus("You already have an attending photo. Upload a new one to replace it.");
        }
      })
      .catch(function () {
        setStatus("Could not load frame template.", true);
      });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        loadImage(String(reader.result))
          .then(function (img) {
            state.img = img;
            state.scale = 1;
            state.ox = 0;
            state.oy = 0;
            zoom.value = "100";
            zoom.disabled = false;
            confirmBtn.disabled = false;
            setStatus("Adjust zoom and drag to fit, then confirm.");
            redraw();
          })
          .catch(function () {
            setStatus("Could not read that photo.", true);
          });
      };
      reader.readAsDataURL(file);
    });

    zoom.addEventListener("input", function () {
      state.scale = Number(zoom.value) / 100;
      redraw();
    });

    function pointerDown(e) {
      if (!state.img) return;
      dragging = true;
      canvas.style.cursor = "grabbing";
      var pt = e.touches ? e.touches[0] : e;
      lastX = pt.clientX;
      lastY = pt.clientY;
      e.preventDefault();
    }
    function pointerMove(e) {
      if (!dragging || !state.img) return;
      var pt = e.touches ? e.touches[0] : e;
      var rect = canvas.getBoundingClientRect();
      var scaleX = FRAME_W / rect.width;
      var scaleY = FRAME_H / rect.height;
      state.ox += (pt.clientX - lastX) * scaleX;
      state.oy += (pt.clientY - lastY) * scaleY;
      // Soft clamp so photo still covers the hole
      var base = coverScale(state.img.width, state.img.height, HOLE.w, HOLE.h) * state.scale;
      var drawW = state.img.width * base;
      var drawH = state.img.height * base;
      var maxOx = Math.max(0, (drawW - HOLE.w) / 2);
      var maxOy = Math.max(0, (drawH - HOLE.h) / 2);
      state.ox = clamp(state.ox, -maxOx, maxOx);
      state.oy = clamp(state.oy, -maxOy, maxOy);
      lastX = pt.clientX;
      lastY = pt.clientY;
      redraw();
      e.preventDefault();
    }
    function pointerUp() {
      dragging = false;
      if (state.img) canvas.style.cursor = "grab";
    }

    canvas.addEventListener("mousedown", pointerDown);
    window.addEventListener("mousemove", pointerMove);
    window.addEventListener("mouseup", pointerUp);
    canvas.addEventListener("touchstart", pointerDown, { passive: false });
    canvas.addEventListener("touchmove", pointerMove, { passive: false });
    canvas.addEventListener("touchend", pointerUp);

    confirmBtn.addEventListener("click", function () {
      if (!state.img || confirmBtn.disabled) return;
      confirmBtn.disabled = true;
      setStatus("Saving…");
      redraw();
      var dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      Promise.resolve(onConfirm(dataUrl))
        .then(function (result) {
          var url =
            (result && (result.attendeeFrameUrl || result.url)) || dataUrl;
          syncDownload(url);
          setStatus("Saved. You can download your attending photo below.");
          confirmBtn.disabled = false;
          confirmBtn.textContent = "Update photo";
        })
        .catch(function (err) {
          setStatus((err && err.message) || "Could not save. Try again.", true);
          confirmBtn.disabled = false;
        });
    });

    return {
      destroy: function () {
        window.removeEventListener("mousemove", pointerMove);
        window.removeEventListener("mouseup", pointerUp);
        root.innerHTML = "";
      },
      getDataUrl: function () {
        redraw();
        return canvas.toDataURL("image/png");
      },
      HOLE: HOLE,
      FRAME_W: FRAME_W,
      FRAME_H: FRAME_H,
    };
  }

  global.EcdFrameEditor = {
    mount: mount,
    renderComposite: renderComposite,
    loadImage: loadImage,
    HOLE: HOLE,
    FRAME_W: FRAME_W,
    FRAME_H: FRAME_H,
  };
})(typeof window !== "undefined" ? window : globalThis);
