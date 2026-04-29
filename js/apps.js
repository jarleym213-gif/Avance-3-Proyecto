import { supabase } from "./supabase.js";
import { currentUser, currentRole } from "./auth.js";

// REFERENCIAS DOM
const contenedor = document.getElementById("contenedorProductos");
const btnLoad = document.getElementById("btnLoad");
const btnAdd = document.getElementById("btnAdd");
const btnCancel = document.getElementById("btnCancel");

const txtId = document.getElementById("txtId");
const txtNombre = document.getElementById("txtNombre");
const txtMarca = document.getElementById("txtMarca");
const txtPrecio = document.getElementById("txtPrecio");
const txtStock = document.getElementById("txtStock");
const tituloForm = document.getElementById("tituloForm");
const txtDescripcion = document.getElementById("txtDescripcion");
const tablaProductos = document.getElementById("tablaProductos");
tablaProductos.style.display = "none";
// VARIABLES GLOBALES
let rolUsuario = "";
let cantidades = {};

console.log(currentUser);
console.log(currentRole);

//INICIO
window.onload = async () => {
  await actualizarContadorCarrito();
  await obtenerRol();
  console.log("Rol detectado:", rolUsuario);
  if (rolUsuario === "comprador") {
    const menuClientes = document.getElementById("menuClientes");
    const menuEmpleados = document.getElementById("menuEmpleados");
    const interno = document.getElementById("interno");

    if (menuClientes) menuClientes.style.display = "none";
    if (menuEmpleados) menuEmpleados.style.display = "none";
    if (interno) interno.style.display = "none";
  }
  if (contenedor) {
    await consultarProductos();
  }
};

// OBTENER ROL USUARIO
const obtenerRol = async () => {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    window.location.href = "login.html";
    return;
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", userData.user.id)
    .maybeSingle();
    console.log("Respuesta rol:", data, error);

  if (error) {
    console.error(error);
    return;
  }

  rolUsuario = (data?.rol || "vendedor").trim().toLowerCase();

  console.log("EMAIL:", userData.user.email);
  console.log("ROL BD:", data);
};

// CONSULTAR PRODUCTOS
const consultarProductos = async () => {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("activo", true);

  if (error) {
    console.error(error);
    Swal.fire("Error cargando productos");
    return;
  }

  contenedor.innerHTML = "";

  data.forEach((p) => {
    if (!cantidades[p.id]) {
      cantidades[p.id] = 1;
    }

    const botonesAdmin =
      rolUsuario === "admin"
        ? `
        <button class="btn btn-warning btn-sm btnEditar mt-2" data-id="${p.id}">
          Editar
        </button>
        <button class="btn btn-danger btn-sm btnEliminar mt-2" data-id="${p.id}">
          Eliminar
        </button>
      `
        : "";

    const div = document.createElement("div");
    div.className = "col-md-3 mb-4";
    div.id = `producto-${p.id}`;

    div.innerHTML = `
      <div class="card shadow text-center p-3">

        <div style="font-size:50px; margin-top:10px;">
          <i class="${obtenerIcono(p.nombre)}"></i>
        </div>

        <div class="card-body">

          <h5>${p.nombre}</h5>
          <h6>${p.marca}</h6>
          <p>₡${p.precio}</p>
          <small>Stock: ${p.stock}</small>
          <p class="text-muted small mt-2">${p.descripcion || ""}</p>

          <div class="d-flex justify-content-center align-items-center mt-2">

            <button class="btn btn-light btn-sm btnMenos" data-id="${p.id}">-</button>

            <span class="mx-2" id="cant-${p.id}">${cantidades[p.id]}</span>

            <button class="btn btn-light btn-sm btnMas" data-id="${p.id}">+</button>

          </div>

          <button class="btn btn-primary btn-sm mt-2 btnAgregar"
            data-id="${p.id}"
            data-nombre="${p.nombre}"
            data-precio="${p.precio}">
            Agregar
          </button>

          ${botonesAdmin}

        </div>
      </div>
    `;

    contenedor.appendChild(div);
  });
};

//GUARDAR PRODUCTO
const guardarProducto = async () => {
  if (rolUsuario === "vendedor" && txtId.value) {
    Swal.fire("No puedes editar productos");
    return;
  }

  const producto = {
    nombre: txtNombre.value.trim(),
    marca: txtMarca.value.trim(),
    precio: txtPrecio.value.trim(),
    stock: txtStock.value.trim(),
    descripcion: txtDescripcion.value.trim(),
    fecha_creacion: new Date()
  };

  if (
    !producto.nombre ||
    !producto.marca ||
    !producto.precio ||
    !producto.stock ||
    !producto.descripcion
  ) {
    Swal.fire("Complete todos los campos");
    return;
  }

  let error;

  if (txtId.value) {
    const response = await supabase
      .from("productos")
      .update(producto)
      .eq("id", txtId.value);

    error = response.error;
  } else {
    const response = await supabase.from("productos").insert([producto]);

    error = response.error;
  }

  if (error) {
    console.error(error);
    Swal.fire("Error guardando producto");
    return;
  }

  Swal.fire("Producto guardado");

  limpiarFormulario();
  consultarProductos();
};

// ELIMINAR PRODUCTO
const eliminarProducto = async (id) => {
  if (rolUsuario !== "admin") {
    Swal.fire("No tienes permiso");
    return;
  }

  const confirmacion = await Swal.fire({
    title: "¿Eliminar producto?",
    text: "Nota: Quedará el historial de venta en la base de datos",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  });

  if (!confirmacion.isConfirmed) return;

  // SOFT DELETE
  const { error } = await supabase
    .from("productos")
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    console.error(error);
    Swal.fire("Error eliminando");
    return;
  }

  const card = document.getElementById(`producto-${id}`);
  if (card) card.remove();

  Swal.fire("Producto eliminado");
};

// AGREGAR AL CARRITO
const agregarCarrito = async (id, nombre, precio, cantidad) => {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    Swal.fire("Debe iniciar sesión");
    return;
  }

  const { data: existe, error: errorSelect } = await supabase
    .from("carrito")
    .select("*")
    .eq("producto_id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (errorSelect) {
    console.error(errorSelect);
    return;
  }

  if (existe) {
    const nuevaCantidad = existe.cantidad + cantidad;

    await supabase
      .from("carrito")
      .update({ cantidad: nuevaCantidad })
      .eq("id", existe.id);

  } else {
    const { error } = await supabase.from("carrito").insert([{
      producto_id: id,
      nombre,
      precio,
      cantidad,
      usuario_id: user.id
    }]);

    if (error) {
      console.error(error);
      Swal.fire(error.message);
      return;
    }
  }

  await actualizarContadorCarrito();
  Swal.fire("Agregado al carrito");
};
// LIMPIAR FORMULARIO
const limpiarFormulario = () => {
  txtId.value = "";
  txtNombre.value = "";
  txtMarca.value = "";
  txtPrecio.value = "";
  txtStock.value = "";
  txtDescripcion.value = "";
  btnAdd.textContent = "Guardar";
  tituloForm.textContent = "Agregar Producto";
};

// EVENTOS GLOBALES
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btnMas")) {
  const id = e.target.dataset.id;

  // Obtener stock desde el DOM
  const stockTexto = document.querySelector(`#producto-${id} small`).innerText;
  const stock = parseInt(stockTexto.replace("Stock: ", ""));

  if (cantidades[id] < stock) {
    cantidades[id]++;
    document.getElementById(`cant-${id}`).innerText = cantidades[id];
  } else {
    Swal.fire("No puedes superar el stock disponible");
  }
}

  if (e.target.classList.contains("btnMenos")) {
    const id = e.target.dataset.id;
    if (cantidades[id] > 1) {
      cantidades[id]--;
      document.getElementById(`cant-${id}`).innerText = cantidades[id];
    }
  }

  if (e.target.classList.contains("btnAgregar")) {
    const id = e.target.dataset.id;
    const nombre = e.target.dataset.nombre;
    const precio = e.target.dataset.precio;

    await agregarCarrito(id, nombre, precio, cantidades[id]);
  }

  if (e.target.classList.contains("btnEditar")) {
    const id = e.target.dataset.id;

    const { data } = await supabase
      .from("productos")
      .select("*")
      .eq("id", id)
      .single();

    txtId.value = data.id;
    txtNombre.value = data.nombre;
    txtMarca.value = data.marca;
    txtPrecio.value = data.precio;
    txtStock.value = data.stock;
    txtDescripcion.value = data.descripcion || "";
    btnAdd.textContent = "Actualizar";
    tituloForm.textContent = "Editar Producto";
  }

  if (e.target.classList.contains("btnEliminar")) {
    const id = e.target.dataset.id;
    await eliminarProducto(id);
  }
});

// EVENTOS BOTONES

if (btnLoad) btnLoad.addEventListener("click", consultarProductos);
if (btnAdd) btnAdd.addEventListener("click", guardarProducto);
if (btnCancel) btnCancel.addEventListener("click", limpiarFormulario);

// ICONO
const obtenerIcono = (nombre) => {
  const n = nombre.toLowerCase();

  if (n.includes("teclado")) return "fas fa-keyboard";
  if (n.includes("mouse")) return "fas fa-mouse";
  if (n.includes("laptop")) return "fas fa-laptop";
  if (n.includes("monitor")) return "fas fa-desktop";
  if (n.includes("audifono")) return "fas fa-headphones";
  if (n.includes("usb")) return "fas fa-usb";
  if (n.includes("silla")) return "fas fa-chair";
  if (n.includes("ssd") || n.includes("disco")) return "fas fa-hdd";
  if (n.includes("cargador") || n.includes("fuente")) return "fas fa-plug";

  return "fas fa-box";
};

// ===============================
// CONTADOR GLOBAL CARRITO
// ===============================
const actualizarContadorCarrito = async () => {

  const { data: { user } } = await supabase.auth.getUser();

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

  badge.innerText = total;
  badge.style.display = total > 0 ? "inline-block" : "none";
};

// EJECUTAR SIEMPRE
document.addEventListener("DOMContentLoaded", () => {
  actualizarContadorCarrito();
});

// hacerla global
window.actualizarContadorCarrito = actualizarContadorCarrito;