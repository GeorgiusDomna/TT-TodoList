const container = document.querySelector('.container');
const todoList = document.querySelector('#todo-list');
const form = document.querySelector('form');

const alert = document.querySelector('#alert');
const alertMessage = document.querySelector('#message');
const alertBtn = document.querySelector('#alertBtn');

const baseURL = 'https://jsonplaceholder.typicode.com';
let state = {};


class NetworkError extends Error {
    constructor(message = 'Нет интернет соединения.') {
        super(message);
        this.name = "NetworkError";
    };
};
class InvalidIdError extends Error {
    constructor(message = 'Действие невозможно. <br>На сервере todo с таким id не существует, вы выдумали его сами!') {
        super(message);
        this.name = "InvalidIdError";
    };
};


// Открисовка при загрузке страницы
async function loadData() {
    const [users, todos] = await Promise.all([
        getFetch(baseURL, 'users'),
        getFetch(baseURL, 'todos')
    ]);

    if (users && todos) {
        // Создание стейта приложения, для удобства и оптимизации данные сгруппированны по id
        state.users = Object.groupBy(users, ({ id }) => id);
        state.todos = Object.groupBy(todos, ({ id }) => id);

        // Отрисовка приложения
        users.forEach(user => createOption(user));
        todos.forEach(todoData => todoList.prepend(createTodo(todoData)));
    };
};

// Получение данных с сервера
async function getFetch(baseURL, endpoint) {
    try {
        if (!navigator.onLine) throw new NetworkError();
        const res = await fetch(`${baseURL}/${endpoint}`);
        if (!res.ok) throw new Error(`Ошибка при загрузке данных: ${res.status} - ${res.statusText}.`);

        return await res.json();
    } catch (error) {
        toggleAlert(error, true);
    };
};

// Отправка новой задачи на сервер
async function postTodo(baseURL, userId, todoText) {
    try {
        if (!navigator.onLine) throw new NetworkError();
        if (!todoText) throw new Error('Для добовления задачи напишите её текст.');
        if (!userId) throw new Error('Выберите пользователя.');

        const res = await fetch(`${baseURL}/todos`, {
            method: 'POST',
            body: JSON.stringify({
                userId: userId,
                title: todoText,
                completed: false
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });
        if (!res.ok) throw new Error(`Ошибка при добавлении задачи: ${res.status} - ${res.statusText}`);
        
        return await res.json();
    } catch (error) {
        toggleAlert(error);
    };
};

// Обновление статуса выполнения задачи на сервере
async function toggleStatus(baseURL, {id, completed}) {
    try {
        if (!navigator.onLine) throw new NetworkError();
        if (id >= 201) throw new InvalidIdError();
        const res = await fetch(`${baseURL}/todos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                completed: !completed
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });
        if (!res.ok) throw new Error(`Ошибка при обновлении статуса задачи: ${res.status} - ${res.statusText}`);

        return await res.json();
    } catch (error) {
        toggleAlert(error);
    };
};

// Запрос на удаление задачи на сервере
async function removeTodo(id) {
    try {
        if (!navigator.onLine) throw new NetworkError();
        if (id >= 201) throw new InvalidIdError();
        const res = await fetch(`${baseURL}/posts/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Ошибка при удалении задачи: ${res.status} - ${res.statusText}`);

        return true;
    } catch (error) {
        toggleAlert(error);
    };
};



// отображение/сокрытие алерта с сообщением ошибки (isPageLoad нужен чтобы при загрузке страницы toggleAlert не вызывалась дважды)
function toggleAlert(error, isPageLoad) {
    const isAlertClosed = !alert.classList.contains('close');
    if (isPageLoad && isAlertClosed) return;

    alert.classList.toggle('close');
    alertMessage.innerHTML = isAlertClosed ? '' : error.message;
    container.style.filter = isAlertClosed ? '' : 'blur(2px)';
    container.style.pointerEvents = isAlertClosed ? '' : 'none';
};

alertBtn.addEventListener('click', toggleAlert);



// Отрисовка пункта select для выбора пользователей
function createOption(user) {
    const option = document.createElement('option');
    option.textContent = user.name;
    option.value = user.id;

    form['user-todo'].append(option);
};


// Отрисовка задачи
function createTodo(todoData) {
    const li = document.createElement('li');
    li.classList.add('todo-item')
    li.innerHTML = `<div>${todoData.title}</div><i>by</i> <b>${state.users[todoData.userId][0].name}</b>`;

    const checkbox = createCheckbox(todoData);
    li.prepend(checkbox);
    
    const removeBtn = createRemoveBtn(todoData.id);
    li.append(removeBtn);

    return li;
};

// Создание Checkbox элемента
function createCheckbox(todoData) {
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    todoData.completed && checkbox.setAttribute('checked', '');
    checkbox.addEventListener('click', event => handleCheckbox(event, todoData));

    return checkbox;
};

// Обработчик нажатия на checkbox
async function handleCheckbox(event, todoData) {
    event.preventDefault();

    const newTodoData = await toggleStatus(baseURL, todoData);
    if (newTodoData) {
        state = { ...state, todos: { ...state.todos, [todoData.id]: [ newTodoData ] } }; // отображение изменений в стейте приложения

        let newTodo = createTodo(newTodoData);
        event.target.parentElement.replaceWith(newTodo);
    };
};

// Создание кнопки удаления задачи
function createRemoveBtn(id) {
    const removeImgBtn = new Image();
    removeImgBtn.src = './svg/delete-icon.svg';
    removeImgBtn.classList.add('removeBtn');

    removeImgBtn.addEventListener('click', event => handleRemoveBtn(event, id));
    return removeImgBtn;
};

// Обработчик нажатия на кнопку удаления
async function handleRemoveBtn(event, id) {
    const res = await removeTodo(id);
    if (res) {
        const { [id]: _, ...updatedTodos } = state.todos;
        state = { ...state, todos: updatedTodos}; // отображение изменений в стейте приложения

        event.target.parentElement.remove();
    };
};



// Обработчик события отправки формы
form.addEventListener('submit', async(event) => {
    event.preventDefault();

    const userList = this['user-todo'];
    const textTodo = this['new-todo'];

    const newTodoData = await postTodo(baseURL, +userList.value, textTodo.value);
    if (newTodoData) {
        state = { ...state, todos: { ...state.todos, [newTodoData.id]: [ newTodoData ] } }; // отображение изменений в стейте приложения
        todoList.prepend(createTodo(newTodoData));
        userList.selectedIndex = 0;
        textTodo.value = "";
    };
});


loadData();