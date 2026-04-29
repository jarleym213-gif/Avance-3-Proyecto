import { supabase } from "./supabase.js";
import { currentUser, currentRole } from "./auth.js";

// REFERENCIAS DOM
const tbody = document.getElementById("tbodyClientes");
const btnLoad = document.getElementById("btnLoad");
const btnAdd = document.getElementById("btnAdd");
const btnCancel = document.getElementById("btnCancel");

const txtId = document.getElementById("txtId");
const txtNombre = document.getElementById("txtNombre");
const txtCorreo = document.getElementById("txtCorreo");
const txtTelefono = document.getElementById("txtTelefono");
const tituloForm = document.getElementById("tituloForm");
const txtPassword = document.getElementById("txtPassword");

// VARIABLES GLOBALES
let rolUsuario = "";

// INICIO
window.onload = async () => {
  await obtenerRol();
  await consultarClientes();
};

// OBTENER ROL DEL USUARIO LOGUEADO
const obtenerRol = async () => {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("correo", userData.user.email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  rolUsuario = (data?.rol || "vendedor").trim().toLowerCase();

  if (rolUsuario === "comprador") {
    window.location.href = "index.html";
  }
};

// CONSULTAR CLIENTES
const consultarClientes = async () => {
  if (!tbody) return;

  const { data, error } = await supabase
    .from("clientes")
    .select("id,nombre,correo,telefono,fecha_creacion,usuario_id")
    .order("id", { ascending: true });

  if (error) {
    console.error(error);
    Swal.fire("Error cargando clientes");
    return;
  }

  renderClientes(data);
};

// RENDERIZAR CLIENTES EN LA TABLA
const renderClientes = (data) => {
  tbody.innerHTML = "";

  data.forEach((c) => {
    const botonesAdmin = rolUsuario === "admin"
      ? `
        <button class="btnEditar btn btn-warning btn-sm" data-id="${c.id}">Editar</button>
        <button class="btnEliminar btn btn-danger btn-sm" data-id="${c.id}">Eliminar</button>
      `
      : "";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nombre}</td>
      <td>${c.correo}</td>
      <td>${c.telefono}</td>
      <td>${new Date(c.fecha_creacion).toLocaleDateString()}</td>
      <td>${botonesAdmin}</td>
    `;

    tbody.appendChild(tr);
  });
};

// GUARDAR CLIENTE
const guardarCliente = async () => {

  const cliente = {
    nombre: txtNombre.value.trim(),
    correo: txtCorreo.value.trim(),
    telefono: txtTelefono.value.trim()
  };

  if (!cliente.nombre || !cliente.correo || !cliente.telefono) {
    Swal.fire("Complete todos los campos");
    return;
  }

  //Editar cliente
  if (txtId.value) {

    const { data: clienteActual } = await supabase
      .from("clientes")
      .select("usuario_id")
      .eq("id", txtId.value)
      .maybeSingle();

    // validar duplicado excluyendo el mismo usuario
    const { data: existe } = await supabase
      .from("usuarios")
      .select("*")
      .eq("correo", cliente.correo)
      .neq("id", clienteActual.usuario_id)
      .maybeSingle();

    if (existe) {
      Swal.fire("El correo ya está registrado");
      return;
    }

    // actualizar cliente
    const { error } = await supabase
      .from("clientes")
      .update({
        nombre: cliente.nombre,
        correo: cliente.correo,
        telefono: cliente.telefono
      })
      .eq("id", txtId.value);

    if (error) {
      console.error(error);
      Swal.fire("Error actualizando cliente");
      return;
    }

    // actualizar usuario (correo)
    await supabase
      .from("usuarios")
      .update({ correo: cliente.correo })
      .eq("id", clienteActual.usuario_id);

    Swal.fire("Cliente actualizado correctamente");

    limpiarFormulario();
    consultarClientes();
    return;
  }

  // CREAR NUEVO CLIENTE

  const password = txtPassword.value.trim();

  if (!password) {
    Swal.fire("Debe ingresar contraseña");
    return;
  }

  // validar duplicado
  const { data: existe } = await supabase
    .from("usuarios")
    .select("*")
    .eq("correo", cliente.correo)
    .maybeSingle();

  if (existe) {
    Swal.fire("El correo ya está registrado");
    return;
  }

  // guardar sesión actual
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionActual = sessionData.session;

  // crear usuario en auth
  const { data: authData, error: errorAuth } =
    await supabase.auth.signUp({
      email: cliente.correo,
      password: password
    });

  if (errorAuth || !authData?.user) {
    console.error(errorAuth);
    Swal.fire("Error creando usuario");
    return;
  }

  const userId = authData.user.id;

  // restaurar sesión admin
  if (sessionActual) {
    await supabase.auth.setSession(sessionActual);
  }

  // insertar en usuarios
  const { error: errorUsuario } = await supabase
    .from("usuarios")
    .insert([{
      id: userId,
      correo: cliente.correo,
      rol: "comprador"
    }]);

  if (errorUsuario) {
    console.error(errorUsuario);
    Swal.fire("Error creando usuario");
    return;
  }

  // insertar en clientes
  const { error } = await supabase
    .from("clientes")
    .insert([{
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono,
      usuario_id: userId,
      fecha_creacion: new Date()
    }]);

  if (error) {
    console.error(error);
    Swal.fire("Error guardando cliente");
    return;
  }

  Swal.fire("Cliente creado correctamente");

  limpiarFormulario();
  consultarClientes();
};

// ELIMINAR CLIENTE
const eliminarCliente = async (id) => {
  if (rolUsuario !== "admin") return;

  const result = await Swal.fire({
    title: "¿Deseas eliminar este cliente?",
    text: "Esta acción no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!result.isConfirmed) return;

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    Swal.fire("Error eliminando cliente");
    return;
  }

  Swal.fire("Cliente eliminado correctamente");
  consultarClientes();
};

// OBTENER CLIENTE POR ID 
const obtenerClientePorId = async (id) => {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    Swal.fire("Error cargando cliente");
    return null;
  }

  return data;
};

// LIMPIAR FORMULARIO
const limpiarFormulario = () => {
  txtId.value = "";
  txtNombre.value = "";
  txtCorreo.value = "";
  txtTelefono.value = "";
  txtPassword.value = "";
  btnAdd.textContent = "Guardar";
  tituloForm.textContent = "Agregar Cliente";
};

// EVENTOS
btnLoad?.addEventListener("click", consultarClientes);
btnAdd?.addEventListener("click", guardarCliente);
btnCancel?.addEventListener("click", limpiarFormulario);

// EVENT DELEGATION
tbody?.addEventListener("click", async (event) => {
  const target = event.target;

  if (rolUsuario !== "admin") return;

  if (target.classList.contains("btnEliminar")) {
    const id = target.dataset.id;
    await eliminarCliente(id);
  }

  if (target.classList.contains("btnEditar")) {
    const id = target.dataset.id;

    const cliente = await obtenerClientePorId(id);
    if (!cliente) return;

    txtId.value = cliente.id;
    txtNombre.value = cliente.nombre;
    txtCorreo.value = cliente.correo;
    txtTelefono.value = cliente.telefono;
    txtCorreo.disabled = true;

    btnAdd.textContent = "Actualizar";
    tituloForm.textContent = "Editar Cliente";
  }
});