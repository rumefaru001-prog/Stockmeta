import React, { useState, useEffect } from "react";
import { X, Youtube, Plus, Trash2, Edit2, Save } from "lucide-react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import toast from "react-hot-toast";

interface Tutorial {
  id: string;
  title: string;
  link: string;
}

interface TutorialModalProps {
  onClose: () => void;
  isAdmin: boolean;
}

export function TutorialModal({ onClose, isAdmin }: TutorialModalProps) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLink, setNewLink] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const docRef = doc(db, "settings", "tutorials");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setTutorials(docSnap.data().items);
      } else {
        setTutorials([]);
      }
    }, (error) => {
      console.warn("Tutorials fetch failed:", error.message);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (updatedTutorials: Tutorial[]) => {
    try {
      await setDoc(doc(db, "settings", "tutorials"), { items: updatedTutorials });
      toast.success("Tutorials updated successfully!");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "settings/tutorials");
      toast.error(`Failed to update tutorials: ${error.message}`);
    }
  };

  const handleAdd = () => {
    if (!newTitle || !newLink) return;
    const newTutorial: Tutorial = {
      id: Date.now().toString(),
      title: newTitle,
      link: newLink
    };
    const updated = [...tutorials, newTutorial];
    setTutorials(updated);
    handleSave(updated);
    setNewTitle("");
    setNewLink("");
  };

  const handleDelete = (id: string) => {
    const updated = tutorials.filter(t => t.id !== id);
    setTutorials(updated);
    handleSave(updated);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingId(tutorial.id);
    setNewTitle(tutorial.title);
    setNewLink(tutorial.link);
  };

  const handleUpdate = () => {
    if (!newTitle || !newLink || !editingId) return;
    const updated = tutorials.map(t => 
      t.id === editingId ? { ...t, title: newTitle, link: newLink } : t
    );
    setTutorials(updated);
    handleSave(updated);
    setEditingId(null);
    setNewTitle("");
    setNewLink("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-[#1e293b]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-500" />
            Tutorials
          </h2>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isEditing ? 'bg-indigo-500 text-white' : 'bg-[#1e293b] text-gray-400 hover:text-white'}`}
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isAdmin && isEditing && (
            <div className="mb-6 p-4 bg-[#1e293b]/50 border border-[#334155] rounded-xl space-y-3">
              <h3 className="text-sm font-bold text-white mb-2">{editingId ? 'Edit Tutorial' : 'Add New Tutorial'}</h3>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Tutorial Title (e.g. See Video Documentation)"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
              />
              <input
                type="text"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="YouTube Link"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setNewTitle("");
                      setNewLink("");
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={editingId ? handleUpdate : handleAdd}
                  disabled={!newTitle || !newLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {editingId ? <Save className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {editingId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {tutorials.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No tutorials available yet.
              </div>
            ) : (
              tutorials.map((tutorial, index) => {
                // Generate a color based on index for the border/bg to match the demo image
                const colors = [
                  'border-rose-500/50 bg-rose-950/30 text-rose-100 hover:bg-rose-900/40',
                  'border-amber-500/50 bg-amber-950/30 text-amber-100 hover:bg-amber-900/40',
                  'border-emerald-500/50 bg-emerald-950/30 text-emerald-100 hover:bg-emerald-900/40',
                  'border-blue-500/50 bg-blue-950/30 text-blue-100 hover:bg-blue-900/40',
                  'border-purple-500/50 bg-purple-950/30 text-purple-100 hover:bg-purple-900/40'
                ];
                const colorClass = colors[index % colors.length];

                return (
                  <div key={tutorial.id} className="flex items-center gap-2">
                    <a
                      href={tutorial.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 py-4 px-6 rounded-xl border ${colorClass} transition-all text-center font-bold text-sm shadow-lg`}
                    >
                      {tutorial.title}
                    </a>
                    {isAdmin && isEditing && (
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(tutorial)}
                          className="p-2 bg-[#1e293b] text-blue-400 hover:text-blue-300 rounded-lg border border-[#334155]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tutorial.id)}
                          className="p-2 bg-[#1e293b] text-red-400 hover:text-red-300 rounded-lg border border-[#334155]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
