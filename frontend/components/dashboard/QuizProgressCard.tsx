import { Card } from "@/components/ui/card";

type ColorVariant = "pink" | "blue" | "green";

interface QuizProgressCardProps {
  current: number;
  total: number;
  topic: string;
  color?: ColorVariant;
  onClick?: () => void;
}

const colorClasses: Record<ColorVariant, string> = {
  pink: "bg-gradient-to-br from-red-50 to-red-100",
  blue: "bg-gradient-to-br from-blue-50 to-blue-100",
  green: "bg-gradient-to-br from-green-50 to-green-100",
};

const iconBgClasses: Record<ColorVariant, string> = {
  pink: "bg-red-200/50",
  blue: "bg-blue-200/50",
  green: "bg-green-200/50",
};

export function QuizProgressCard({
  current,
  total,
  topic,
  color = "pink",
  onClick,
}: QuizProgressCardProps) {
  return (
    <Card
      className={`${colorClasses[color]} border-0 rounded-3xl p-6 cursor-pointer hover:shadow-md transition-all shadow-sm`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-8">
        <div className={`w-14 h-14 ${iconBgClasses[color]} rounded-2xl`}></div>
      </div>
      <p className="text-sm text-gray-500 mb-1 font-medium">
        {current}/{total} quiz
      </p>
      <h3 className="font-semibold text-gray-900 text-base">{topic}</h3>
    </Card>
  );
}
