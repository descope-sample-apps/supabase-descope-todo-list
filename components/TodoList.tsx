import { Database } from "@/lib/schema";
import { createSupabaseClient } from "@/lib/initSupabase";
import { useEffect, useState } from "react";
import { getSessionToken } from "@descope/nextjs-sdk/client";
import { jwtDecode } from "jwt-decode";

type Todos = Database["public"]["Tables"]["todos"]["Row"];

export default function TodoList() {
  const [todos, setTodos] = useState<Todos[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [supabase, setSupabase] = useState(null);

  const sessionToken = getSessionToken();
  const decodedToken = jwtDecode(sessionToken);
  const userId = decodedToken.sub;

  useEffect(() => {
    const initializeSupabase = async () => {
      const response = await fetch("/api/create-jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setSupabase(createSupabaseClient(data.token));
    };

    initializeSupabase();
  }, []);

  useEffect(() => {
    if (supabase) {
      const fetchTodos = async () => {
        const { data: todos, error } = await supabase
          .from("todos")
          .select("*")
          .order("id", { ascending: true });

        if (error) console.log("error", error);
        else setTodos(todos);
      };
      fetchTodos();
    }
  }, [supabase]);

  const addTodo = async (taskText: string) => {
    let task = taskText.trim();
    if (task.length) {
      const { data: todo, error } = await supabase
        .from("todos")
        .insert({ task, user_id: decodedToken.sub })
        .select()
        .single();

      if (error) {
        setErrorText(error.message);
      } else {
        setTodos([...todos, todo]);
        setNewTaskText("");
      }
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await supabase.from("todos").delete().eq("id", id).throwOnError();
      setTodos(todos.filter((x) => x.id != id));
    } catch (error) {
      console.log("error", error);
    }
  };

  return (
    <div className="w-full">
      <h1 className="mb-12">Todo List.</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo(newTaskText);
        }}
        className="flex gap-2 my-2"
      >
        <input
          className="rounded w-full p-2"
          type="text"
          placeholder="make coffee"
          value={newTaskText}
          onChange={(e) => {
            setErrorText("");
            setNewTaskText(e.target.value);
          }}
        />
        <button className="btn-black" type="submit">
          Add
        </button>
      </form>
      {!!errorText && <Alert text={errorText} />}
      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul>
          {todos.map((todo) => (
            <Todo
              key={todo.id}
              todo={todo}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

const Todo = ({ todo, onDelete }: { todo: Todos; onDelete: () => void }) => {
  const [isCompleted, setIsCompleted] = useState(todo.is_complete);
  const [supabase, setSupabase] = useState(null);

  const sessionToken = getSessionToken();
  const decodedToken = jwtDecode(sessionToken);
  const userId = decodedToken.sub;

  useEffect(() => {
    const initializeSupabase = async () => {
      const response = await fetch("/api/create-jwt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setSupabase(createSupabaseClient(data.token));
    };

    initializeSupabase();
  }, []);

  const toggle = async () => {
    try {
      if (supabase) {
        const { data } = await supabase
          .from("todos")
          .update({ is_complete: !isCompleted })
          .eq("id", todo.id)
          .throwOnError()
          .select()
          .single();

        if (data) setIsCompleted(data.is_complete);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  return (
    <li className="w-full block cursor-pointer hover:bg-gray-200 focus:outline-none focus:bg-gray-200 transition duration-150 ease-in-out">
      <div className="flex items-center px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center">
          <div className="text-sm leading-5 font-medium truncate">
            {todo.task}
          </div>
        </div>
        <div>
          <input
            className="cursor-pointer"
            onChange={(e) => toggle()}
            type="checkbox"
            checked={isCompleted ? true : false}
          />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="w-4 h-4 ml-2 border-2 hover:border-black rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="gray"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </li>
  );
};

const Alert = ({ text }: { text: string }) => (
  <div className="rounded-md bg-red-100 p-4 my-3">
    <div className="text-sm leading-5 text-red-700">{text}</div>
  </div>
);
