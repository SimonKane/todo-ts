import "./style.css";
import { v4 as uuid } from "uuid";
import { supabase } from "./supabaseClient";

//Type for Todo
interface Todo {
  id: string;
  user_id?: string;
  title: string;
  completed: boolean;
  user_email?: string;
}

//Supabase
interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

//Usable global variables
const input = document.querySelector(".todo-title") as HTMLInputElement | null;
const inputContainer = document.querySelector(
  ".input-container"
) as HTMLDivElement;
const addBtn = document.querySelector(".add-todo") as HTMLButtonElement;
const mainContainer = document.querySelector(".container") as HTMLDivElement;
const todoContainer = document.querySelector(".todo-list") as HTMLUListElement;
const clearBtn = document.createElement("button") as HTMLButtonElement;
const email = document.querySelector(".email") as HTMLInputElement;
const password = document.querySelector(".password") as HTMLInputElement;
const login = document.querySelector(".login") as HTMLButtonElement;
const signup = document.querySelector(".signup") as HTMLButtonElement;
const loginContainer = document.querySelector(
  ".login-container"
) as HTMLDivElement;

let editingMode: boolean = false;

//Todo-array that is based on local storage if there is something there
let todos: Todo[] = [];

//-----Functions----//

//Function to append clear button and clear list
function clearList(): void {
  clearBtn.textContent = "Clear list";
  clearBtn.classList.add("clear-btn");

  if (todos.length > 0) mainContainer.append(clearBtn);
  clearBtn.addEventListener("click", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const response = await supabase
      .from("todo-table")
      .delete()
      .eq("user_id", user?.id);
    if (response.error) console.error("Error clearing list");
    setTimeout(() => {
      todos = [];
      renderTodos(todos);
      clearBtn.remove();
    }, 200);
  });
}
// Adds todo to todo-list and render the list again.
async function addTodo(): Promise<void> {
  if (!input) {
    throw new Error("Input element does not exist");
  }

  let title: string = input.value
    ? input.value[0].toUpperCase() + input.value.slice(1, input.value.length)
    : "";

  if (!title || title.trim() === "") {
    input.value = "";
    input.placeholder = "Write something to add task...";
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  todos.push({ id: uuid(), user_id: user?.id, title: title, completed: false });

  const { error }: SupabaseResponse<Todo[]> = await supabase
    .from("todo-table")
    .insert({
      ...todos[todos.length - 1],
      user_id: user?.id,
      user_email: user?.email,
    });
  if (error) {
    console.log("error no workie");
  }
  input.value = "";
  input.placeholder = "Write Todo...";
  renderTodos(todos);
  // localStorage.setItem("Todos", JSON.stringify(todos));
}

//Checks the todo array to and generates the list in HTML.

async function renderTodos(arr: Todo[]): Promise<void> {
  if (todos.length < 1) clearBtn.remove();
  todoContainer.innerHTML = "";
  clearList();

  const sortedArray: Todo[] = arr.sort((a, b) => {
    if (a.completed && !b.completed) {
      return 1;
    } else if (!a.completed && b.completed) {
      return -1;
    } else {
      return 0;
    }
  });

  sortedArray.forEach((todo) => {
    todoContainer.innerHTML += `<div class="todo-content"><li style="text-decoration:${
      todo.completed ? "line-through" : ""
    }; background:${todo.completed ? "lightgrey" : ""}; color:${
      todo.completed ? "grey" : ""
    }" class="todo-item" id=${todo.id}>${
      todo.title
    } </li><div class="todo-btns"><button id=${
      todo.id
    } class="edit"><i class="fa-solid fa-pencil"></i></button> <button id=${
      todo.id
    } class="delete"><i class="fa-regular fa-trash-can"></i></button></div></div>`;
  });

  //Eventlisteners that gets append to each Delete- and Edit-buttons
  document.querySelectorAll(".delete")?.forEach((btn) => {
    btn.addEventListener("click", (e): void => {
      const target = e.target as Element;

      const targetElement = target.nodeName.includes("I")
        ? (target.parentElement as HTMLButtonElement)
        : (target as HTMLButtonElement);
      deleteTodo(targetElement.id);
    });
  });
  document.querySelectorAll(".edit")?.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetElement = e.target as HTMLElement;

      const target = targetElement.nodeName.includes("I")
        ? (targetElement.parentElement as HTMLButtonElement)
        : (targetElement as HTMLButtonElement);

      const targetParent = target.parentElement as HTMLDivElement;
      startEditTodo(targetParent);
    });
  });

  //Eventlistener on the title of the todo that makes it clickable and toggles if done or not.
  document.querySelectorAll(".todo-item").forEach((item) => {
    item.addEventListener("click", (e: Event) => {
      if (!editingMode) toggleDone(e);
    });
  });
}
//Function to toggle the line through effect
async function toggleDone(e: Event): Promise<void> {
  let target = e.target as HTMLLIElement;
  if (!target || !target.id) return;
  let changeDoneItem = todos.find((el) => el.id === target.id);
  if (changeDoneItem) {
    changeDoneItem.completed = !changeDoneItem.completed;
    const { error }: SupabaseResponse<Todo[]> = await supabase
      .from("todo-table")
      .update({ completed: changeDoneItem.completed })
      .eq("id", target.id);
    if (error) console.error("Error finding item");
  }
  target.style.textDecoration =
    target.style.textDecoration === "line-through" ? "" : "line-through";
  target.style.color = "grey";
  target.style.background = "lightgrey";

  if (!changeDoneItem?.completed) {
    renderTodos(todos);
  } else {
    setTimeout(() => {
      renderTodos(todos);
    }, 1000);
  }
}
//Function that gets called on delete button, removes todo from todos-array based on id and then calls the renderTodos() again.
async function deleteTodo(id: string): Promise<void> {
  if (id) {
  }
  const response = await supabase.from("todo-table").delete().eq("id", id);
  if (response.error) console.log(response.error);
  todos = todos.filter((todo) => todo.id !== id);
  renderTodos(todos);
}

//Changes the title of the todo-item to an input-field in wich you can edit the title. Then resets as text with new input value.
function startEditTodo(active: HTMLDivElement): void {
  document.querySelectorAll("button").forEach((btn) => {
    if (btn.innerHTML.includes("fa-pencil")) btn.disabled = true;
  });
  let liElement = active.previousElementSibling as HTMLLIElement | null;
  if (!liElement) {
    console.error("no element found");
    return;
  }

  liElement.style.textDecoration = "";
  active.innerHTML = "";
  liElement.innerHTML = `<input class="edit-input" type="text" value="${liElement.innerHTML}"> <button class="complete-edit"><i class="fa-regular fa-circle-check"></i></button>`;
  editingMode = true;
  liElement.style.background = "white";

  document.querySelectorAll(".complete-edit")?.forEach((updateBtn) => {
    updateBtn.addEventListener("click", async () => {
      const text = document.querySelector(
        ".edit-input"
      ) as HTMLInputElement | null;
      if (!text) return;
      if (text.value.trim() === "") {
        text.value = "";
        text.placeholder = "Write something..";
        return;
      }
      const textValue: string = text.value;
      liElement.innerHTML = textValue;
      liElement.style.background = "white";

      const { error }: SupabaseResponse<Todo[]> = await supabase
        .from("todo-table")
        .update({ title: textValue })
        .eq("id", liElement.id);

      if (error) console.error("Error updating");

      todos.filter((edit) => {
        if (liElement.id === edit.id) {
          edit.title = textValue;
          edit.completed = false;
          renderTodos(todos);
        }
      });

      document.querySelectorAll("button").forEach((btn) => {
        if (btn.innerHTML.includes("fa-pencil")) btn.disabled = false;
      });
      editingMode = false;
    });

    //Snippet to make "Enter" keypress valid to add the changes to the todo

    const editInput = document.querySelector(".edit-input") as HTMLInputElement;
    editInput.addEventListener("keypress", (e: KeyboardEvent) => {
      const btn = updateBtn as HTMLButtonElement;
      if (e.key === "Enter") {
        btn.click();
      }
    });
  });
}

//Eventlisteners on the add button that needs to generate from start and also a listener on the inputfield so i can use Enter to add todo1
addBtn.addEventListener("click", addTodo);
input?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addBtn.click();
  }
});

login.addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });

  if (error) {
    console.log(error);
    todoContainer.style.color = "rgb(180, 33, 33)";
    if (error.message === "Invalid login credentials") {
      todoContainer.innerHTML =
        "No log in credentials found, make sure to sign up first";
      return;
    }
    todoContainer.innerHTML = error.message.replace("phone", "password");
    email.value = "";
    password.value = "";
  } else {
    todoContainer.style.color = "black";
    loginContainer.style.display = "none";
    inputContainer.style.display = "flex";
    renderTodos(todos);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data }: SupabaseResponse<Todo[]> = await supabase
      .from("todo-table")
      .select("*")
      .eq("user_id", user?.id);
    if (data) {
      todos = data;
      renderTodos(todos);
    }
    const logoutBtn = document.createElement("button") as HTMLButtonElement;
    logoutBtn.classList.add("logout");
    logoutBtn.innerHTML = "LOG OUT";
    document.body.append(logoutBtn);
    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Could not sign out", error.message);
      }
      todoContainer.innerHTML = "";
      email.value = "";
      password.value = "";
      loginContainer.style.display = "flex";
      inputContainer.style.display = "none";
      todos = [];
      logoutBtn.remove();
      clearBtn.remove();
    });
  }
});

signup.addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
  });

  if (error) {
    console.error("User not registred", error.message);
    todoContainer.innerHTML = error.message;
    todoContainer.style.color = "rgb(180, 33, 33)";
    email.value = "";
    password.value = "";
  } else {
    todoContainer.style.color = "black";
    console.log("Signed up: ", data.user?.email);
    email.value = "";
    password.value = "";
    todoContainer.innerHTML = "Signed up sucessfully, please log in";
  }
});
