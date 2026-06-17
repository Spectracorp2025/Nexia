import React, { useState, useEffect } from "react";
import { Note, Task, Reminder, CalendarEvent } from "../types";
import { db, handleFirestoreError } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc 
} from "firebase/firestore";
import { motion } from "motion/react";
import { 
  Notebook, CheckSquare, Bell, Calendar as CalendarIcon, 
  Plus, Trash2, Edit2, Check, Clock, CalendarDays, ChevronLeft, ChevronRight, AlertCircle 
} from "lucide-react";

interface ProductivityCenterProps {
  userId: string;
  onReminderAlert: (reminders: Reminder[]) => void;
}

export default function ProductivityCenter({ userId, onReminderAlert }: ProductivityCenterProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "tasks" | "reminders" | "calendar">("tasks");
  
  // Realtime state
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Local inputs
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");

  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const [calTitle, setCalTitle] = useState("");
  const [calDescription, setCalDescription] = useState("");
  const [calDate, setCalDate] = useState("");
  const [calColor, setCalColor] = useState("purple");

  // Calendar render navigation helper
  const [currentDate, setCurrentDate] = useState(new Date());

  // Set up Firestore Listeners
  useEffect(() => {
    if (!userId) return;

    if (userId.startsWith("invitado_")) {
      // 1. Load Notes
      const localNotes = localStorage.getItem(`guest_notes_${userId}`);
      setNotes(localNotes ? JSON.parse(localNotes) : []);

      // 2. Load Tasks
      const localTasks = localStorage.getItem(`guest_tasks_${userId}`);
      setTasks(localTasks ? JSON.parse(localTasks) : []);

      // 3. Load Reminders
      const localReminders = localStorage.getItem(`guest_reminders_${userId}`);
      const remList = localReminders ? JSON.parse(localReminders) : [];
      setReminders(remList);
      const pending = remList.filter((r: any) => !r.completed);
      if (pending.length > 0) {
        onReminderAlert(pending);
      }

      // 4. Load Events
      const localEvents = localStorage.getItem(`guest_events_${userId}`);
      setCalendarEvents(localEvents ? JSON.parse(localEvents) : []);

      return; // Skip firestore subscriptions for guest sessions
    }

    // 1. Listen for Notes
    const notesPath = `users/${userId}/notes`;
    const qNotes = query(collection(db, "users", userId, "notes"), orderBy("updatedAt", "desc"));
    const unsubNotes = onSnapshot(qNotes, (snap) => {
      const list: Note[] = [];
      snap.forEach(d => { list.push(d.data() as Note); });
      setNotes(list);
    }, (err) => handleFirestoreError(err, "list" as any, notesPath));

    // 2. Listen for Tasks
    const tasksPath = `users/${userId}/tasks`;
    const qTasks = query(collection(db, "users", userId, "tasks"), orderBy("createdAt", "desc"));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const list: Task[] = [];
      snap.forEach(d => { list.push(d.data() as Task); });
      setTasks(list);
    }, (err) => handleFirestoreError(err, "list" as any, tasksPath));

    // 3. Listen for Reminders
    const remindersPath = `users/${userId}/reminders`;
    const qReminders = query(collection(db, "users", userId, "reminders"), orderBy("createdAt", "asc"));
    const unsubReminders = onSnapshot(qReminders, (snap) => {
      const list: Reminder[] = [];
      snap.forEach(d => { list.push(d.data() as Reminder); });
      setReminders(list);
      
      // Trigger alerts on pending (uncompleted) once on snapshot initial load
      const pending = list.filter(r => !r.completed);
      if (pending.length > 0) {
        onReminderAlert(pending);
      }
    }, (err) => handleFirestoreError(err, "list" as any, remindersPath));

    // 4. Listen for Events
    const eventsPath = `users/${userId}/events`;
    const qEvents = query(collection(db, "users", userId, "events"), orderBy("createdAt", "asc"));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const list: CalendarEvent[] = [];
      snap.forEach(d => { list.push(d.data() as CalendarEvent); });
      setCalendarEvents(list);
    }, (err) => handleFirestoreError(err, "list" as any, eventsPath));

    return () => {
      unsubNotes();
      unsubTasks();
      unsubReminders();
      unsubEvents();
    };
  }, [userId]);

  // Notes controller handlers
  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;
    const noteId = selectedNoteId || `note_${Date.now()}`;
    const data: Note = {
      id: noteId,
      userId,
      title: noteTitle,
      content: noteContent,
      updatedAt: new Date().toISOString()
    };

    if (userId.startsWith("invitado_")) {
      const nextNotes = selectedNoteId
        ? notes.map(n => n.id === selectedNoteId ? data : n)
        : [data, ...notes];
      setNotes(nextNotes);
      localStorage.setItem(`guest_notes_${userId}`, JSON.stringify(nextNotes));
      setNoteTitle("");
      setNoteContent("");
      setSelectedNoteId(null);
      return;
    }

    const path = `users/${userId}/notes/${noteId}`;
    try {
      await setDoc(doc(db, "users", userId, "notes", noteId), data);
      setNoteTitle("");
      setNoteContent("");
      setSelectedNoteId(null);
    } catch (err) {
      handleFirestoreError(err, "write" as any, path);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (userId.startsWith("invitado_")) {
      const nextNotes = notes.filter(n => n.id !== id);
      setNotes(nextNotes);
      localStorage.setItem(`guest_notes_${userId}`, JSON.stringify(nextNotes));
      if (selectedNoteId === id) {
        setNoteTitle("");
        setNoteContent("");
        setSelectedNoteId(null);
      }
      return;
    }

    const path = `users/${userId}/notes/${id}`;
    try {
      await deleteDoc(doc(db, "users", userId, "notes", id));
      if (selectedNoteId === id) {
        setNoteTitle("");
        setNoteContent("");
        setSelectedNoteId(null);
      }
    } catch (err) {
      handleFirestoreError(err, "delete" as any, path);
    }
  };

  // Checkbox Tasks handlers
  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    const taskId = `task_${Date.now()}`;
    const data: Task = {
      id: taskId,
      userId,
      title: taskTitle,
      completed: false,
      createdAt: new Date().toISOString()
    };

    if (userId.startsWith("invitado_")) {
      const nextTasks = [data, ...tasks];
      setTasks(nextTasks);
      localStorage.setItem(`guest_tasks_${userId}`, JSON.stringify(nextTasks));
      setTaskTitle("");
      return;
    }

    const path = `users/${userId}/tasks/${taskId}`;
    try {
      await setDoc(doc(db, "users", userId, "tasks", taskId), data);
      setTaskTitle("");
    } catch (err) {
      handleFirestoreError(err, "write" as any, path);
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (userId.startsWith("invitado_")) {
      const nextTasks = tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t);
      setTasks(nextTasks);
      localStorage.setItem(`guest_tasks_${userId}`, JSON.stringify(nextTasks));
      return;
    }

    const path = `users/${userId}/tasks/${task.id}`;
    try {
      await updateDoc(doc(db, "users", userId, "tasks", task.id), {
        completed: !task.completed
      });
    } catch (err) {
      handleFirestoreError(err, "write" as any, path);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (userId.startsWith("invitado_")) {
      const nextTasks = tasks.filter(t => t.id !== id);
      setTasks(nextTasks);
      localStorage.setItem(`guest_tasks_${userId}`, JSON.stringify(nextTasks));
      return;
    }

    const path = `users/${userId}/tasks/${id}`;
    try {
      await deleteDoc(doc(db, "users", userId, "tasks", id));
    } catch (err) {
      handleFirestoreError(err, "delete" as any, path);
    }
  };

  // Alerts & Reminders handlers
  const handleAddReminder = async () => {
    if (!reminderText.trim() || !reminderTime) return;
    const remId = `remnd_${Date.now()}`;
    const data: Reminder = {
      id: remId,
      userId,
      text: reminderText,
      time: reminderTime,
      completed: false,
      createdAt: new Date().toISOString()
    };

    if (userId.startsWith("invitado_")) {
      const nextRems = [...reminders, data];
      setReminders(nextRems);
      localStorage.setItem(`guest_reminders_${userId}`, JSON.stringify(nextRems));
      setReminderText("");
      setReminderTime("");
      return;
    }

    const path = `users/${userId}/reminders/${remId}`;
    try {
      await setDoc(doc(db, "users", userId, "reminders", remId), data);
      setReminderText("");
      setReminderTime("");
    } catch (err) {
      handleFirestoreError(err, "write" as any, path);
    }
  };

  const handleToggleReminder = async (rem: Reminder) => {
    if (userId.startsWith("invitado_")) {
      const nextRems = reminders.map(r => r.id === rem.id ? { ...r, completed: !r.completed } : r);
      setReminders(nextRems);
      localStorage.setItem(`guest_reminders_${userId}`, JSON.stringify(nextRems));
      return;
    }

    const path = `users/${userId}/reminders/${rem.id}`;
    try {
      await updateDoc(doc(db, "users", userId, "reminders", rem.id), {
        completed: !rem.completed
      });
    } catch (err) {
      handleFirestoreError(err, "write" as any, path);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (userId.startsWith("invitado_")) {
      const nextRems = reminders.filter(r => r.id !== id);
      setReminders(nextRems);
      localStorage.setItem(`guest_reminders_${userId}`, JSON.stringify(nextRems));
      return;
    }

    const path = `users/${userId}/reminders/${id}`;
    try {
      await deleteDoc(doc(db, "users", userId, "reminders", id));
    } catch (err) {
      handleFirestoreError(err, "delete" as any, path);
    }
  };

  // Calendar handlers
  const handleAddCalendarEvent = async () => {
    if (!calTitle.trim() || !calDate) return;
    const evId = `event_${Date.now()}`;
    const data: CalendarEvent = {
      id: evId,
      userId,
      title: calTitle,
      date: calDate, // 'YYYY-MM-DD'
      description: calDescription,
      color: calColor,
      type: "custom",
      createdAt: new Date().toISOString()
    };

    if (userId.startsWith("invitado_")) {
      const nextEvents = [...calendarEvents, data];
      setCalendarEvents(nextEvents);
      localStorage.setItem(`guest_events_${userId}`, JSON.stringify(nextEvents));
      setCalTitle("");
      setCalDescription("");
      setCalDate("");
      return;
    }

    const path = `users/${userId}/events/${evId}`;
    try {
      await setDoc(doc(db, "users", userId, "events", evId), data);
      setCalTitle("");
      setCalDescription("");
      setCalDate("");
    } catch (err) {
      handleFirestoreError(err, "write" as any, path);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (userId.startsWith("invitado_")) {
      const nextEvents = calendarEvents.filter(e => e.id !== id);
      setCalendarEvents(nextEvents);
      localStorage.setItem(`guest_events_${userId}`, JSON.stringify(nextEvents));
      return;
    }

    const path = `users/${userId}/events/${id}`;
    try {
      await deleteDoc(doc(db, "users", userId, "events", id));
    } catch (err) {
      handleFirestoreError(err, "delete" as any, path);
    }
  };

  // Calendar monthly calculations
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const d = new Date(year, month, 1).getDay();
    // adjust standard sunday layout
    return d === 0 ? 6 : d - 1; // monday starts index 0
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const daysCount = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonthDaysList = () => {
    const list = [];
    const prevDaysCount = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      list.push({ day: prevDaysCount - i, isCurrentMonth: false });
    }
    return list;
  };

  const currentMonthDaysList = () => {
    const list = [];
    for (let i = 1; i <= daysCount; i++) {
      list.push({ day: i, isCurrentMonth: true });
    }
    return list;
  };

  const getDayEvents = (dayNumber: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    return calendarEvents.filter(e => e.date === dStr);
  };

  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800/80 overflow-hidden shadow-xl flex flex-col h-[520px]">
      
      {/* Productivity switcher tabs header bar */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/40 p-1">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs tracking-wider uppercase font-bold transition rounded-lg ${
            activeTab === "tasks" 
              ? "bg-purple-600/25 border-b-2 border-purple-400 text-purple-200" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <CheckSquare className="w-4 h-4 text-cyan-400" />
          Tareas
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs tracking-wider uppercase font-bold transition rounded-lg ${
            activeTab === "notes" 
              ? "bg-purple-600/25 border-b-2 border-purple-400 text-purple-200" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <Notebook className="w-4 h-4 text-purple-400" />
          Notas
        </button>
        <button
          onClick={() => setActiveTab("reminders")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs tracking-wider uppercase font-bold transition rounded-lg ${
            activeTab === "reminders" 
              ? "bg-purple-600/25 border-b-2 border-purple-400 text-purple-200" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <Bell className="w-4 h-4 text-pink-400" />
          Alertas
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs tracking-wider uppercase font-bold transition rounded-lg ${
            activeTab === "calendar" 
              ? "bg-purple-600/25 border-b-2 border-purple-400 text-purple-200" 
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-blue-400" />
          Calendario
        </button>
      </div>

      {/* Main viewport panels */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0 bg-slate-900/30">

        {/* 1. CHECKBOX TASKS VIEWPORT */}
        {activeTab === "tasks" && (
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="flex gap-2">
              <input
                id="task-input-title"
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Añadir nueva tarea..."
                className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 outline-none transition"
              />
              <button
                id="task-add-btn"
                onClick={handleAddTask}
                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer border border-cyan-500/50 p-2.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1 min-h-[280px]">
              {tasks.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  No hay tareas pendientes en la base de datos de Nexia. ✨
                </div>
              ) : (
                tasks.map(task => (
                  <motion.div
                    id={`task-row-${task.id}`}
                    key={task.id}
                    layout
                    className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/55 hover:border-slate-800 hover:bg-slate-950/70 transition"
                  >
                    <div 
                      onClick={() => handleToggleTask(task)}
                      className="flex items-center gap-3 cursor-pointer flex-1 select-none"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        task.completed 
                          ? "bg-cyan-500 border-cyan-400 text-slate-950" 
                          : "border-slate-700 hover:border-cyan-500"
                      }`}>
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-sm tracking-wide ${task.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                        {task.title}
                      </span>
                    </div>
                    <button
                      id={`task-del-btn-${task.id}`}
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. BLOC DE NOTAS VIEWPORT */}
        {activeTab === "notes" && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-full">
            {/* Sidebar list */}
            <div className="md:col-span-2 border-r border-slate-800/30 pr-2 space-y-2 flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Tus Notas</span>
                {selectedNoteId && (
                  <button 
                    onClick={() => { setSelectedNoteId(null); setNoteTitle(""); setNoteContent(""); }}
                    className="text-cyan-400 hover:text-cyan-300 text-xxs font-mono uppercase bg-cyan-950 px-2 py-0.5 rounded cursor-pointer border border-cyan-400/20"
                  >
                    NUEVA
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 list-scrollbar">
                {notes.length === 0 ? (
                  <div className="text-2xs text-center text-slate-500 py-12">
                    Sin notas creadas.
                  </div>
                ) : (
                  notes.map(note => (
                    <div
                      id={`note-item-${note.id}`}
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={`p-2.5 rounded-lg cursor-pointer text-left transition relative border ${
                        selectedNoteId === note.id 
                          ? "bg-purple-950/40 border-purple-500/60 text-purple-100" 
                          : "bg-slate-950/20 border-slate-800/60 text-slate-300 hover:bg-slate-950/55 hover:border-slate-800"
                      }`}
                    >
                      <p className="text-xs font-bold truncate pr-6">{note.title}</p>
                      <p className="text-2xs text-slate-400 truncate mt-0.5">{note.content || "Sin contenido"}</p>
                      <button
                        id={`note-del-${note.id}`}
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="absolute right-2 top-2.5 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Note Editor */}
            <div className="md:col-span-3 flex flex-col justify-between space-y-2 h-[400px]">
              <div className="space-y-2 flex-grow-1 flex flex-col">
                <input
                  id="note-editor-title"
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Título de la nota..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-100 focus:border-purple-500 outline-none transition"
                />
                <textarea
                  id="note-editor-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escribe algo interesante con Nexia..."
                  className="w-full flex-grow-1 bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:border-purple-500 outline-none resize-none transition h-[260px] list-scrollbar"
                />
              </div>
              <button
                id="note-save-btn"
                onClick={handleSaveNote}
                disabled={!noteTitle.trim()}
                className="w-full text-center py-2 bg-gradient-to-r from-purple-500 to-indigo-600 disabled:opacity-40 select-none hover:brightness-110 active:scale-[0.99] text-white font-semibold rounded-lg text-xs transition duration-200 shadow-md cursor-pointer"
              >
                Guardar Nota 📝
              </button>
            </div>
          </div>
        )}

        {/* 3. ALERTA Y RECODRATORIOS VIEWPORT */}
        {activeTab === "reminders" && (
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input
                id="reminder-input-text"
                type="text"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="Ej. Tomar un vaso con agua o Clase de matemáticas"
                className="md:col-span-6 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-pink-500 outline-none transition"
              />
              <input
                id="reminder-input-time"
                type="datetime-local"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="md:col-span-4 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-pink-500 outline-none transition"
              />
              <button
                id="reminder-add-btn"
                onClick={handleAddReminder}
                className="md:col-span-2 cursor-pointer bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/50 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1 min-h-[280px]">
              {reminders.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-12">
                  No hay alertas programadas. Nexia está vigilante. 📡💜
                </div>
              ) : (
                reminders.map(rem => {
                  const rDate = new Date(rem.time);
                  const isOverdue = !rem.completed && rDate < new Date();
                  return (
                    <div
                      id={`reminder-row-${rem.id}`}
                      key={rem.id}
                      className={`flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border hover:bg-slate-950/70 transition ${
                        isOverdue 
                          ? "border-red-500/40 bg-red-950/5" 
                          : rem.completed 
                            ? "border-slate-800/40 opacity-60" 
                            : "border-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          id={`reminder-check-${rem.id}`}
                          type="checkbox"
                          checked={rem.completed}
                          onChange={() => handleToggleReminder(rem)}
                          className="mt-1 cursor-pointer accent-pink-500"
                        />
                        <div className="text-left">
                          <p className={`text-xs ${rem.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                            {rem.text}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-pink-400 shrink-0" />
                            {rDate.toLocaleString("es-ES")}
                            {isOverdue && (
                              <span className="text-red-400 font-bold ml-1.5 flex items-center gap-0.5 animate-pulse">
                                <AlertCircle className="w-3 h-3" /> ¡Atrasado!
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        id={`reminder-del-${rem.id}`}
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. CALENDARIO MENSUAL VIEWPORT */}
        {activeTab === "calendar" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-h-[400px]">
            {/* Year month select header */}
            <div className="md:col-span-3 flex flex-col justify-between uppercase">
              <div className="flex justify-between items-center mb-3">
                <button 
                  onClick={() => setCurrentDate(new Date(year, month - 1))}
                  className="p-1 rounded bg-slate-950/50 hover:bg-slate-800/40 text-slate-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-extrabold tracking-widest text-slate-200">
                  {monthNames[month]} {year}
                </span>
                <button 
                  onClick={() => setCurrentDate(new Date(year, month + 1))}
                  className="p-1 rounded bg-slate-950/50 hover:bg-slate-800/40 text-slate-300 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Mon-Sun tags */}
              <div className="grid grid-cols-7 text-center text-slate-400 text-[10px] font-bold border-b border-slate-800/80 pb-1 mb-1">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>

              {/* Grid cell planner representing days */}
              <div className="grid grid-cols-7 gap-1 flex-grow">
                {prevMonthDaysList().map((d, index) => (
                  <div key={`prev-${index}`} className="aspect-square bg-slate-950/10 rounded flex items-center justify-center text-[10px] text-slate-600 select-none">
                    {d.day}
                  </div>
                ))}
                {currentMonthDaysList().map(d => {
                  const evs = getDayEvents(d.day);
                  const isToday = 
                    new Date().getDate() === d.day && 
                    new Date().getMonth() === month && 
                    new Date().getFullYear() === year;

                  return (
                    <div 
                      key={`curr-${d.day}`} 
                      onClick={() => {
                        const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
                        setCalDate(dStr);
                      }}
                      className={`aspect-square p-0.5 rounded cursor-pointer relative transition flex flex-col justify-between border select-none ${
                        isToday 
                          ? "bg-cyan-950/40 border-cyan-400 text-cyan-200" 
                          : calDate === `${year}-${String(month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
                            ? "bg-purple-950/30 border-purple-500 text-purple-200"
                            : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <span className="text-[10px] font-mono leading-none font-semibold text-right w-full block pr-1 pt-0.5">
                        {d.day}
                      </span>
                      
                      {/* Events tiny color pill bullets */}
                      <div className="flex gap-0.5 flex-wrap overflow-hidden h-3 max-h-3 mt-0.5">
                        {evs.map((e, i) => (
                          <span 
                            key={i} 
                            style={{ backgroundColor: e.color || "#a855f7" }}
                            className="w-1.5 h-1.5 rounded-full shrink-0" 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Event sidebar creator planner */}
            <div className="md:col-span-1 border-l border-slate-800/30 pl-2 flex flex-col justify-between space-y-3">
              <div className="space-y-2 flex-1 flex flex-col h-[350px]">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-1">
                  Planificador Día
                </span>
                
                <input
                  id="planner-date"
                  type="date"
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-[10px] text-slate-200 focus:border-cyan-500 outline-none"
                />

                <input
                  id="planner-title"
                  type="text"
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  placeholder="Ej. Examen, Cita dental"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-[10px] text-slate-100 placeholder-slate-500 focus:border-cyan-500 outline-none"
                />

                <input
                  id="planner-desc"
                  type="text"
                  value={calDescription}
                  onChange={(e) => setCalDescription(e.target.value)}
                  placeholder="Detalle o hora"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1 text-[10px] text-slate-300 placeholder-slate-500 focus:border-cyan-500 outline-none"
                />

                {/* Color selects */}
                <div className="flex gap-1 justify-between py-1">
                  {["#06b6d4", "#a855f7", "#ec4899", "#eab308", "#10b981"].map(c => (
                    <button
                      key={c}
                      onClick={() => setCalColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full cursor-pointer transition relative flex items-center justify-center ${
                        calColor === c ? "ring-2 ring-white scale-110" : ""
                      }`}
                    >
                      {calColor === c && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 border-t border-slate-850 pt-2 h-[150px] list-scrollbar">
                  {calendarEvents.filter(e => e.date === calDate).length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic py-4 text-center">No hay eventos en este día.</p>
                  ) : (
                    calendarEvents.filter(e => e.date === calDate).map(e => (
                      <div key={e.id} className="p-1 px-2 rounded bg-slate-950/50 border border-slate-850 text-left relative flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-200 truncate max-w-[80px]">{e.title}</p>
                          <p className="text-[8px] text-slate-400 truncate max-w-[80px]">{e.description}</p>
                        </div>
                        <button
                          id={`cal-del-${e.id}`}
                          onClick={() => handleDeleteEvent(e.id)}
                          className="text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                id="planner-add-btn"
                onClick={handleAddCalendarEvent}
                disabled={!calTitle.trim() || !calDate}
                className="w-full text-center py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-40 hover:brightness-110 text-white font-semibold rounded text-[10px] transition cursor-pointer select-none"
              >
                Crear Evento 🗓️
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
