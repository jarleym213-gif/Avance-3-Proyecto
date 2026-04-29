import { supabase } from "./supabase.js";

export let currentUser = null;
export let currentRole = null;

// CARGAR SESIÓN
export const loadUser = async () => {
  const { data } = await supabase.auth.getUser();
  currentUser = data?.user || null;

  const isPublic = ["login.html"].some(p =>
    window.location.pathname.includes(p)
  );

  if (!currentUser && !isPublic) {
    window.location.href = "login.html";
    return;
  }

  // mostrar usuario
  const usuarioLogueado = document.getElementById("usuarioLogueado");
  if (usuarioLogueado && currentUser) {
    usuarioLogueado.innerText = currentUser.email;
  }

  // obtener rol
  if (currentUser) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("correo", currentUser.email)
      .maybeSingle();

    currentRole = perfil?.rol || "comprador";

    applyMenuByRole(currentRole);
  }
};

// MENÚ POR ROL
const applyMenuByRole = (rol) => {
  const menuClientes = document.getElementById("menuClientes");
  const menuEmpleados = document.getElementById("menuEmpleados");
  const menuVentas = document.getElementById("menuVentas");

   if (rol === "comprador") {
    menuClientes.style.display = "none";
    menuEmpleados.style.display = "none";
    menuVentas.style.display = "none";
  } else if (rol === "vendedor") {
    menuClientes.style.display = "block";
    menuEmpleados.style.display = "block";
    menuVentas.style.display = "none"; 
  } else if (rol === "admin") {
    menuClientes.style.display = "block";
    menuEmpleados.style.display = "block";
    menuVentas.style.display = "block"; 
  }
};

// LOGOUT GLOBAL
window.logout = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  currentRole = null;
  window.location.href = "login.html";
};

// ejecutar
loadUser();