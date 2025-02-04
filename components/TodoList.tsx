import { Database } from "@/lib/schema";
import { createSupabaseClient } from "@/lib/initSupabase";
import { useEffect, useState } from "react";
import { useSession } from '@descope/nextjs-sdk/client';
import { jwtDecode } from "jwt-decode";
import { SupabaseClient } from "@supabase/supabase-js";

type Todos = Database["public"]["Tables"]["todos"]["Row"];

export default function TodoList() {
  const [todos, setTodos] = useState<Todos[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(
    null
  );

  const { isAuthenticated, isSessionLoading, sessionToken } = useSession();
  const decodedToken = sessionToken
    ? jwtDecode<{ sub?: string }>(sessionToken)
    : {};
  const userId: string = decodedToken?.sub ?? "";

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const response = await fetch("/api/create-jwt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) throw new Error("Failed to fetch JWT");

        const data = await response.json();
        if (data?.token) {
          const client = createSupabaseClient(data.token);
          setSupabase(client as SupabaseClient<Database>);
        } else {
          throw new Error("Invalid token received");
        }
      } catch (error) {
        console.error("Error initializing Supabase:", error);
      }
    };

    if (userId) {
      initializeSupabase();
    }
  }, [userId]);

  useEffect(() => {
    if (supabase) {
      const fetchTodos = async () => {
        const { data, error } = await supabase
          .from("todos")
          .select("*")
          .order("id", { ascending: true });

        if (error) console.log("error", error);
        else if (data) setTodos(data as Todos[]);
      };

      fetchTodos();
    }
  }, [supabase]);

  const addTodo = async (taskText: string) => {
    let task = taskText.trim();
    if (task.length && supabase) {
      const { data, error } = await supabase
        .from("todos")
        .insert({ task, user_id: userId })
        .select()
        .single();

      if (error) {
        setErrorText(error.message);
      } else if (data) {
        setTodos((prevTodos) => [...prevTodos, data as Todos]);
        setNewTaskText("");
      }
    }
  };

  const deleteTodo = async (id: number) => {
    if (supabase) {
      try {
        await supabase.from("todos").delete().eq("id", id).throwOnError();
        setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
      } catch (error) {
        console.log("error", error);
      }
    }
  };

  return (
    <div className="w-full">
      <h1 className="mb-12">Todo List</h1>
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
          placeholder="Add a task..."
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
              supabase={supabase}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

const Todo = ({
  todo,
  onDelete,
  supabase,
}: {
  todo: Todos;
  onDelete: () => void;
  supabase: SupabaseClient<Database> | null;
}) => {
  const [isCompleted, setIsCompleted] = useState(todo.is_complete);

  const toggle = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("todos")
          .update({ is_complete: !isCompleted }) // Toggle completion status
          .eq("id", todo.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating todo:", error);
        } else if (data) {
          // Update the local state after a successful database update
          setIsCompleted(data.is_complete ?? false); // Ensure a fallback value if is_complete is null
        }
      }
    } catch (error) {
      console.log("Error:", error);
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
            onChange={toggle}
            type="checkbox"
            checked={isCompleted || false} // Default to false if isCompleted is null
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
