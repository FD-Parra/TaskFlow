
"use strict";

// ========================================
// TASKFLOW - GESTOR DE TAREAS
// ========================================

// Elementos del HTML
const taskForm = document.getElementById("taskForm");
const taskIdInput = document.getElementById("taskId");
const taskTitleInput = document.getElementById("taskTitle");
const taskDescriptionInput = document.getElementById("taskDescription");
const taskDateInput = document.getElementById("taskDate");
const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const formTitle = document.getElementById("formTitle");
const formMessage = document.getElementById("formMessage");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const totalTasksElement = document.getElementById("totalTasks");
const pendingTasksElement = document.getElementById("pendingTasks");
const completedTasksElement = document.getElementById("completedTasks");

const STORAGE_KEY = "taskflow_tasks";

// Cargar tareas guardadas
let tasks = loadTasks();

// ========================================
// ALMACENAMIENTO
// ========================================

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (savedTasks === null) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            console.error("El almacenamiento de tareas no es válido.");
            return [];
        }

        return parsedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.description === "string" &&
            typeof task.completed === "boolean" &&
            typeof task.date === "string"
        );
    } catch (error) {
        console.error("No se pudieron cargar las tareas:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("No se pudieron guardar las tareas:", error);
        showMessage(
            "No se pudieron guardar los datos en este navegador.",
            "error"
        );
        return false;
    }
}

// ========================================
// MENSAJES Y UTILIDADES
// ========================================

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = "message " + type;
}

function clearMessage() {
    formMessage.textContent = "";
    formMessage.className = "message";
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// ========================================
// REGISTRAR Y EDITAR TAREAS
// ========================================

taskForm.addEventListener("submit", function (event) {
    event.preventDefault();
    clearMessage();

    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const date = taskDateInput.value;
    const editingId = taskIdInput.value;

    // Validar título obligatorio
    if (title.length === 0) {
        showMessage("El título de la tarea es obligatorio.", "error");
        taskTitleInput.focus();
        return;
    }

    // Validar límites de caracteres
    if (title.length > 80) {
        showMessage("El título no puede superar 80 caracteres.", "error");
        return;
    }

    if (description.length > 250) {
        showMessage(
            "La descripción no puede superar 250 caracteres.",
            "error"
        );
        return;
    }

    // Validar formato de fecha y evitar fechas imposibles
    if (date && !isValidDate(date)) {
        showMessage("La fecha ingresada no es válida.", "error");
        return;
    }

    if (editingId) {
        updateTask(editingId, title, description, date);
    } else {
        addTask(title, description, date);
    }
});

function isValidDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const date = new Date(dateString + "T00:00:00");

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === dateString;
}

function addTask(title, description, date) {
    const newTask = {
        id: createId(),
        title: title,
        description: description,
        date: date,
        completed: false
    };

    tasks.push(newTask);

    if (!saveTasks()) {
        tasks.pop();
        return;
    }

    renderTasks();
    taskForm.reset();
    showMessage("Tarea registrada correctamente.", "success");
    taskTitleInput.focus();
}

function updateTask(id, title, description, date) {
    const index = tasks.findIndex(task => task.id === id);

    if (index === -1) {
        showMessage("No se encontró la tarea que deseas editar.", "error");
        resetForm();
        return;
    }

    const previousTask = { ...tasks[index] };

    tasks[index] = {
        ...tasks[index],
        title: title,
        description: description,
        date: date
    };

    if (!saveTasks()) {
        tasks[index] = previousTask;
        return;
    }

    renderTasks();
    resetForm();
    showMessage("Tarea actualizada correctamente.", "success");
}

// ========================================
// PREPARAR FORMULARIO DE EDICIÓN
// ========================================

function editTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        showMessage("No se encontró la tarea.", "error");
        return;
    }

    taskIdInput.value = task.id;
    taskTitleInput.value = task.title;
    taskDescriptionInput.value = task.description;
    taskDateInput.value = task.date;

    formTitle.textContent = "Editar tarea";
    saveButton.textContent = "Guardar cambios";
    cancelButton.hidden = false;

    clearMessage();

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    taskTitleInput.focus();
}

function resetForm() {
    taskForm.reset();
    taskIdInput.value = "";
    formTitle.textContent = "Agregar nueva tarea";
    saveButton.textContent = "Agregar tarea";
    cancelButton.hidden = true;
    clearMessage();
}

cancelButton.addEventListener("click", resetForm);

// ========================================
// CAMBIAR ESTADO DE UNA TAREA
// ========================================

function toggleTask(id) {
    const index = tasks.findIndex(task => task.id === id);

    if (index === -1) {
        showMessage("No se encontró la tarea.", "error");
        return;
    }

    tasks[index].completed = !tasks[index].completed;

    if (!saveTasks()) {
        tasks[index].completed = !tasks[index].completed;
        return;
    }

    renderTasks();

    const status = tasks[index].completed
        ? "completada"
        : "pendiente";

    showMessage("Tarea marcada como " + status + ".", "success");
}

// ========================================
// ELIMINAR TAREAS
// ========================================

function deleteTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        showMessage("No se encontró la tarea.", "error");
        return;
    }

    const confirmed = window.confirm(
        '¿Deseas eliminar la tarea "' + task.title + '"?'
    );

    if (!confirmed) {
        return;
    }

    const previousTasks = tasks;
    tasks = tasks.filter(item => item.id !== id);

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    if (taskIdInput.value === id) {
        resetForm();
    }

    renderTasks();
    showMessage("Tarea eliminada correctamente.", "success");
}

// ========================================
// BUSCAR Y FILTRAR
// ========================================

searchInput.addEventListener("input", renderTasks);
statusFilter.addEventListener("change", renderTasks);

function getFilteredTasks() {
    const query = searchInput.value.trim().toLocaleLowerCase("es");
    const filter = statusFilter.value;

    return tasks.filter(task => {
        const matchesTitle = task.title
            .toLocaleLowerCase("es")
            .includes(query);

        const matchesStatus =
            filter === "all" ||
            (filter === "pending" && !task.completed) ||
            (filter === "completed" && task.completed);

        return matchesTitle && matchesStatus;
    });
}

// ========================================
// MOSTRAR TAREAS EN PANTALLA
// ========================================

function renderTasks() {
    taskList.replaceChildren();

    // Actualizar resumen
    totalTasksElement.textContent = tasks.length;

    pendingTasksElement.textContent =
        tasks.filter(task => !task.completed).length;

    completedTasksElement.textContent =
        tasks.filter(task => task.completed).length;

    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const icon = document.createElement("span");
        icon.textContent = "📝";

        const heading = document.createElement("h3");
        const description = document.createElement("p");

        if (tasks.length === 0) {
            heading.textContent = "Aún no tienes tareas";
            description.textContent =
                "Agrega tu primera tarea para comenzar.";
        } else {
            heading.textContent = "No se encontraron tareas";
            description.textContent =
                "Prueba con otra búsqueda o cambia el filtro.";
        }

        emptyState.append(icon, heading, description);
        taskList.appendChild(emptyState);
        return;
    }

    filteredTasks.forEach(task => {
        taskList.appendChild(createTaskCard(task));
    });
}

function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card";

    if (task.completed) {
        card.classList.add("task-done");
    }

    const content = document.createElement("div");
    content.className = "task-content";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    content.appendChild(title);

    if (task.description) {
        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description;
        content.appendChild(description);
    }

    if (task.date) {
        const date = document.createElement("p");
        date.className = "task-date";
        date.textContent = "Fecha límite: " + task.date;
        content.appendChild(date);
    }

    const status = document.createElement("span");
    status.className = "task-status " +
        (task.completed ? "status-completed" : "status-pending");

    status.textContent = task.completed
        ? "Completada"
        : "Pendiente";

    content.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.className = "btn-small";
    statusButton.textContent = task.completed
        ? "Reabrir"
        : "Completar";

    statusButton.setAttribute(
        "aria-label",
        (task.completed ? "Reabrir tarea: " : "Completar tarea: ") +
        task.title
    );

    statusButton.addEventListener("click", () => toggleTask(task.id));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn-small";
    editButton.textContent = "Editar";

    editButton.addEventListener("click", () => editTask(task.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-small btn-delete";
    deleteButton.textContent = "Eliminar";

    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(statusButton, editButton, deleteButton);
    card.append(content, actions);

    return card;
}

// ========================================
// INICIAR APLICACIÓN
// ========================================

renderTasks();
