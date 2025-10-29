import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface Skill {
  name: string;
  percentage: number;
  color?: string;
}

interface SkillProgressListProps {
  skills?: Skill[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
}

const defaultSkills: Skill[] = [
  { name: "Sport Skills", percentage: 71, color: "bg-blue-500" },
  { name: "Blogging", percentage: 92, color: "bg-blue-500" },
  { name: "Leadership", percentage: 33, color: "bg-blue-500" },
  { name: "Meditation", percentage: 56, color: "bg-blue-500" },
  { name: "Philosophy", percentage: 77, color: "bg-blue-500" },
];

export function SkillProgressList({
  skills = defaultSkills,
  title = "Developed areas",
  subtitle = "Most common areas of interests",
  isLoading = false,
}: SkillProgressListProps) {
  return (
    <div>
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="space-y-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2.5">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-2.5 w-full" />
              </div>
            ))
          : skills.map((skill, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-semibold text-gray-800">
                    {skill.name}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-gray-900">
                      {skill.percentage}%
                    </span>
                    <button className="w-6 h-6 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-colors">
                      <span className="text-orange-600 text-xs font-bold">
                        →
                      </span>
                    </button>
                  </div>
                </div>
                <Progress value={skill.percentage} className="h-2.5" />
              </div>
            ))}
      </div>
    </div>
  );
}
