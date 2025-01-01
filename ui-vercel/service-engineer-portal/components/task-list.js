import { CheckCircle2, Clock } from 'lucide-react'

const tasks = [
  {
    id: 1,
    title: "Printer repair at Office Corp",
    time: "09:00 AM",
    completed: false,
  },
  {
    id: 2,
    title: "Network troubleshooting at Tech Inc",
    time: "11:30 AM",
    completed: false,
  },
  {
    id: 3,
    title: "Software update at Design Studio",
    time: "02:00 PM",
    completed: true,
  },
  {
    id: 4,
    title: "Hardware installation at Startup Hub",
    time: "04:30 PM",
    completed: false,
  },
]

export function TaskList() {
  return (
    <div className="space-y-8">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start space-x-4">
          <div className="mt-1">
            {task.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">
              {task.title}
            </p>
            <p className="text-sm text-muted-foreground">{task.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

