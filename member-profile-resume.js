(() => {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.get("resume") !== "checkout") return;

  const form = document.getElementById("profileForm");
  const I = window.GYXI18N;
  if (!form || !I) return;

  const note = document.createElement("div");
  note.id = "profileCheckoutResumeNote";
  note.className = "form-message show success";
  const render = () =>
    (note.textContent = I.t("memberCompleteProfileForCheckout"));
  render();
  form.insertBefore(note, form.firstChild);

  let done = false;
  const resumeCheckout = () => {
    if (done) return;
    done = true;
    window.setTimeout(
      () => (window.location.href = "shop.html?resume=profile-checkout"),
      350,
    );
  };

  window.addEventListener("gyx:profile-updated", resumeCheckout, {
    once: true,
  });
  window.addEventListener("gyx:languagechange", render);
  document.getElementById("profile")?.scrollIntoView({ block: "start" });
})();
