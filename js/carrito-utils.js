import { supabase } from "./supabase.js";

export const actualizarContadorCarrito = async () => {
  const user = JSON.parse(localStorage.getItem("usuario"));

  if (!user) return;

  const { data, error } = await supabase
    .from("carrito")
    .select("cantidad")
    .eq("usuario_id", user.id);

  if (error) {
    console.error(error);
    return;
  }

  const total = data.reduce((acc, item) => acc + item.cantidad, 0);

  const badge = document.getElementById("contadorCarrito");

  if (!badge) return;

  if (total > 0) {
    badge.innerText = total;
    badge.style.display = "inline-block";

    // animación
    badge.classList.add("animar");
    setTimeout(() => badge.classList.remove("animar"), 200);

  } else {
    badge.style.display = "none";
  }
};