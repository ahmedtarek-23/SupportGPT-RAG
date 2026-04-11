import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { api } from "../../../services/api";
import type { WeeklySchedule, WeeklyScheduleEntry } from "../../../types";

const TYPE_COLORS: Record<string, string> = {
  lecture: "#0066FF",
  lab: "#7B2FBE",
  tutorial: "#00D4FF",
};

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyScheduleWidget() {
  const [activeDays, setActiveDays] = useState<WeeklyScheduleEntry[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.courses.weeklySchedule()
      .then((data: any) => {
        // API returns either a plain array or { week_schedule, total_lecture_hours }
        const entries: WeeklyScheduleEntry[] = Array.isArray(data)
          ? data
          : (data?.week_schedule ?? []);
        const hours: number = Array.isArray(data)
          ? 0
          : (data?.total_lecture_hours ?? 0);
        setActiveDays(entries.filter((d) => d.slots.length > 0));
        setTotalHours(hours);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <WidgetShell><LoadingRows /></WidgetShell>;
  if (error) return <WidgetShell><ErrorMsg msg={error} /></WidgetShell>;

  return (
    <WidgetShell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(0,102,255,0.12)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Calendar size={16} color="#0066FF" />
          </div>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>
              Weekly Schedule
            </div>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.5)" }}>
              {totalHours.toFixed(1)}h total · {activeDays.length} active days
            </div>
          </div>
        </div>
      </div>

      {activeDays.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "rgba(160,180,230,0.4)",
            fontSize: 13,
            padding: "20px 0",
          }}
        >
          No lectures scheduled — open a course and add slots
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeDays.map((day) => (
            <DayRow key={day.day_index} day={day} />
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

function DayRow({ day }: { day: WeeklyScheduleEntry }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(160,180,230,0.4)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {day.day}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {day.slots.map((slot) => {
          const color = TYPE_COLORS[slot.lecture_type] || "#0066FF";
          return (
            <div
              key={slot.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: `${color}0A`,
                border: `1px solid ${color}20`,
                borderLeft: `3px solid ${color}`,
                borderRadius: "0 10px 10px 0",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: slot.course_color || color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#e8f0ff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {slot.course_name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "rgba(160,180,230,0.5)",
                    marginTop: 2,
                  }}
                >
                  <Clock size={10} />
                  {slot.start_time} – {slot.end_time}
                  {slot.location && <span>· {slot.location}</span>}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color,
                  textTransform: "capitalize",
                  background: `${color}15`,
                  padding: "2px 7px",
                  borderRadius: 5,
                  flexShrink: 0,
                }}
              >
                {slot.lecture_type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "20px 22px",
      }}
    >
      {children}
    </div>
  );
}

function LoadingRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 44,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{ color: "rgba(255,108,108,0.7)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
      {msg}
    </div>
  );
}
