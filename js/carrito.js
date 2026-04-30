import { supabase } from "./supabase.js";
import { actualizarContadorCarrito } from "./carrito-utils.js";
import { currentUser, currentRole } from "./auth.js";

// REFERENCIAS DOM
const tbody = document.getElementById("tbodyCarrito");
const totalText = document.getElementById("total");
const btnFinalizar = document.getElementById("btnFinalizar");
const selectCliente = document.getElementById("selectCliente");
const labelCliente = document.getElementById("clienteSeleccionado");

// Variables globales
let usuarioActual = null;
let clienteAutoId = null;
let rolUsuario = "";

// INICIO
window.onload = async () => {
  usuarioActual = await obtenerUsuario();
  if (!usuarioActual) return;

  await obtenerRol();
  await cargarCarrito();
  await configurarVistaPorRol();
};

// AUTENTICACIÓN USER DESD SUPABASE
const obtenerUsuario = async () => {
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    window.location.href = "login.html";
    return null;
  }

  return data.user;
};

const obtenerRol = async () => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("correo", usuarioActual.email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  rolUsuario = data?.rol?.trim().toLowerCase();
};

// CLIENTES
const obtenerClienteAutomatico = async () => {
  const { data, error } = await supabase
    .from("clientes")
    .select("id,nombre")
    .eq("correo", usuarioActual.email)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};

const cargarClientes = async () => {
  const { data, error } = await supabase
    .from("clientes")
    .select("id,nombre");

  if (error) {
    console.error(error);
    Swal.fire("Error cargando clientes");
    return;
  }

  selectCliente.innerHTML = `<option value="">Seleccione cliente</option>`;

  data.forEach(c => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.nombre;
    selectCliente.appendChild(option);
  });
};

// CARRITO
const cargarCarrito = async () => {
  const { data, error } = await supabase
    .from("carrito")
    .select("*")
    .eq("usuario_id", usuarioActual.id);

  if (error) {
    console.error(error);
    Swal.fire("Error cargando carrito");
    return;
  }

  renderCarrito(data);
};

// SOLO UI
const renderCarrito = (data) => {
  tbody.innerHTML = "";
  let total = 0;

  data.forEach(p => {
    const subtotal = p.precio * p.cantidad;
    total += subtotal;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.producto_id}</td>
      <td>${p.nombre}</td>
      <td>₡${p.precio}</td>
      <td>${p.cantidad}</td>
      <td>₡${subtotal}</td>
      <td>
        <button class="btnEliminar btn btn-danger btn-sm" data-id="${p.id}">Eliminar</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  totalText.innerText = "₡" + total;
};

// ELIMINAR PRODUCTO
const eliminarProducto = async (id) => {
  const { error } = await supabase
    .from("carrito")
    .delete()
    .eq("id", id);

  if (error) {
    Swal.fire("Error eliminando");
    return;
  }

  cargarCarrito();
  await actualizarContadorCarrito();
};

// OBTENER CLIENTE SELECCIONADO O MOSTRAR AUTOMÁTICO
const obtenerClienteSeleccionado = () => {
  if (rolUsuario === "comprador") return clienteAutoId;
  return selectCliente.value;
};

const obtenerCarrito = async () => {
  const { data, error } = await supabase
    .from("carrito")
    .select("*")
    .eq("usuario_id", usuarioActual.id);

  if (error) {
    console.error(error);
    return [];
  }

  return data;
};

const calcularTotal = (carrito) => {
  return carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
};

const crearVenta = async (clienteId, total) => {
  const { data, error } = await supabase
    .from("ventas")
    .insert([{
      usuario_id: usuarioActual.id,
      cliente_id: clienteId,
      total: total
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};

const guardarDetalle = async (ventaId, carrito) => {
  for (const p of carrito) {
    await supabase.from("detalle_venta").insert([{
      venta_id: ventaId,
      producto_id: p.producto_id,
      cantidad: p.cantidad,
      precio: p.precio
    }]);
  }
};

const actualizarStock = async (carrito) => {
  for (const p of carrito) {
    const { data } = await supabase
      .from("productos")
      .select("stock")
      .eq("id", p.producto_id)
      .single();

    await supabase
      .from("productos")
      .update({ stock: data.stock - p.cantidad })
      .eq("id", p.producto_id);
  }
};

const limpiarCarrito = async () => {
  await supabase
    .from("carrito")
    .delete()
    .eq("usuario_id", usuarioActual.id);
};

// FINALIZAR COMPRA
const finalizarCompra = async () => {
  const clienteId = obtenerClienteSeleccionado();

  if (!clienteId) {
    Swal.fire("Seleccione un cliente");
    return;
  }

  const carrito = await obtenerCarrito();

  if (carrito.length === 0) {
    Swal.fire("Carrito vacío");
    return;
  }

  const total = calcularTotal(carrito);

  const venta = await crearVenta(clienteId, total);
  if (!venta) return;

  await guardarDetalle(venta.id, carrito);
  await actualizarStock(carrito);

  // OBTENER NOMBRE DEL CLIENTE PARA MOSTRAR EN EL RESUMEN
  const { data: clienteData } = await supabase
    .from("clientes")
    .select("nombre")
    .eq("id", clienteId)
    .single();

  const nombreCliente = clienteData?.nombre || "Cliente";

  // ARMAR DETALLE PARA MOSTRAR EN EL RESUMEN
  let detalle = "";
  let totalFinal = 0;

  carrito.forEach(p => {
    const subtotal = p.precio * p.cantidad;
    totalFinal += subtotal;

    detalle += `
      <tr>
        <td>${p.nombre}</td>
        <td>${p.cantidad}</td>
        <td>₡${p.precio}</td>
        <td>₡${subtotal}</td>
      </tr>
    `;
  });

  const fecha = new Date(venta.fecha).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" });
  // MOSTRAR RESUMEN DE LA VENTA ANTES DE LIMPIAR EL CARRITO
  await Swal.fire({
  title: "Factura de Compra",
  html: `
    <h4>Cliente: ${nombreCliente}</h4>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <hr>
    <table style="width:100%">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cant</th>
          <th>Precio</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>${detalle}</tbody>
    </table>
    <hr>
    <h3>Total: ₡${totalFinal}</h3>
  `,
  width: 600
});

  //LIMPIAR CARRITO DESPUÉS DE MOSTRAR EL RESUMEN
  await limpiarCarrito();

  cargarCarrito();
  await actualizarContadorCarrito();
};

// CONFIGURAR VISTA POR ROL
const configurarVistaPorRol = async () => {
  if (rolUsuario === "comprador") {
    selectCliente.style.display = "none";

    const cliente = await obtenerClienteAutomatico();

    if (cliente) {
      clienteAutoId = cliente.id;
      labelCliente.innerHTML = `Cliente: <strong>${cliente.nombre}</strong>`;
    }

  } else {
    selectCliente.style.display = "block";
    await cargarClientes();
  }
};
// ACTUALIZAR CONTADOR CARRITO
document.addEventListener("DOMContentLoaded", () => {
  actualizarContadorCarrito();
});
// ACTUALIZAR CONTADOR CARRITO
document.addEventListener("DOMContentLoaded", () => {
  actualizarContadorCarrito();
});

// EVENTOS ELIMINAR Y FINALIZAR
tbody.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btnEliminar")) {
    await eliminarProducto(e.target.dataset.id);
  }
});

btnFinalizar?.addEventListener("click", finalizarCompra);