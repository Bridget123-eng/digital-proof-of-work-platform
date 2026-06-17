import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api/axios";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    API.get("/system/notifications")
      .then(({ data }) => {
        setNotifications(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await API.patch(`/system/notifications/${notificationId}/read`);
      setNotifications((current) =>
        current.map((item) => (item._id === notificationId ? { ...item, read: true } : item))
      );
      setMessage("Notification marked as read.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update notification.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-slate-600">Open your latest platform updates, review results, and system alerts.</p>
        </div>

        <div className="grid gap-4 rounded border border-slate-200 bg-white p-6">
          {message && <p className="rounded bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {status === "loading" && <p>Loading notifications...</p>}
          {status === "error" && <p className="text-red-600">Unable to load notifications.</p>}
          {status === "ready" && notifications.length === 0 && <p>No notifications yet.</p>}

          {notifications.map((item) => (
            <article key={item._id} className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.message}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                    {item.type || "system"} | {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item._id)}
                    className="rounded border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </article>
          ))}

          <div className="grid gap-3 pt-2 md:grid-cols-2">
            <button className="rounded border border-slate-300 px-4 py-3" type="button" onClick={() => navigate(-1)}>
              Back
            </button>
            <Link className="rounded border border-slate-300 px-4 py-3 text-center" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
