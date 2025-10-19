import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type HeroVariant = "greeting" | "achievements" | "tasks";

interface HeroCardProps {
  variant?: HeroVariant;
  userName?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  achievements?: Array<{
    label: string;
    percentage: number;
  }>;
  tasks?: {
    prioritized: number;
    additional: number;
  };
}

export function HeroCard({
  variant = "greeting",
  userName = "User",
  title = "Lorem ipsum lorem ipsum",
  subtitle,
  buttonText = "lorem ipsum",
  onButtonClick,
  achievements,
  tasks,
}: HeroCardProps) {
  const firstName = userName.split(" ")[0];

  if (variant === "greeting") {
    return (
      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-10 border-0 rounded-3xl shadow-lg">
        <p className="text-sm mb-3 opacity-90 font-medium">Welcome back</p>
        <h1 className="text-5xl font-bold mb-3">Hello, {firstName}</h1>
        <p className="text-2xl mb-8 opacity-90 font-light">{title}</p>
        <Button
          onClick={onButtonClick}
          className="bg-black hover:bg-gray-800 text-white px-10 py-3 rounded-full text-sm font-medium"
        >
          {buttonText}
        </Button>
      </Card>
    );
  }

  if (variant === "achievements" && achievements) {
    return (
      <div className="flex gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-12 border-0 rounded-3xl flex-1 shadow-lg">
          <p className="text-sm mb-3 opacity-90 font-medium">Lorem lorem</p>
          <p className="text-3xl font-light leading-tight">{title}</p>
        </Card>
        {achievements.map((achievement, idx) => (
          <Card
            key={idx}
            className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 border-0 rounded-3xl w-36 h-44 flex flex-col items-center justify-center shadow-lg relative"
          >
            <p className="text-xs mb-3 opacity-60 absolute top-4 left-4 right-4 text-left">{achievement.label}</p>
            <p className="text-5xl font-bold">{achievement.percentage}%</p>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "tasks" && tasks) {
    return (
      <div className="flex gap-6">
        <Card className="bg-white p-10 border border-gray-200 rounded-3xl flex-1 shadow-sm">
          <h1 className="text-5xl font-bold mb-3">LOREM</h1>
          <p className="text-2xl text-gray-600 font-light mb-8">{title}</p>
          <Button
            onClick={onButtonClick}
            className="bg-black hover:bg-gray-800 text-white px-10 py-3 rounded-full text-sm font-medium"
          >
            {buttonText}
          </Button>
        </Card>
        <Card className="bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 p-6 border-0 rounded-3xl w-56 h-52 flex flex-col justify-between shadow-lg">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-gray-800">Prioritized<br />tasks</p>
            <div className="w-7 h-7 rounded-full bg-white/40 flex items-center justify-center">
              <span className="text-gray-700 text-sm">⊕</span>
            </div>
          </div>
          <div>
            <p className="text-6xl font-bold text-gray-900 mb-1">{tasks.prioritized}%</p>
            <p className="text-xs text-gray-700 opacity-75">Avg. Completed</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-200 via-blue-200 to-blue-300 p-6 border-0 rounded-3xl w-56 h-52 flex flex-col justify-between shadow-lg">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-gray-800">Additional<br />tasks</p>
            <div className="w-7 h-7 rounded-full bg-white/40 flex items-center justify-center">
              <span className="text-gray-700 text-sm">☺</span>
            </div>
          </div>
          <div>
            <p className="text-6xl font-bold text-gray-900 mb-1">{tasks.additional}%</p>
            <p className="text-xs text-gray-700 opacity-75">Avg. Completed</p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
