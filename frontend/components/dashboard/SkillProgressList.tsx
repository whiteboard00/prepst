import { Progress } from "@/components/ui/progress";

interface Skill {
  name: string;
  percentage: number;
  color?: string;
}

interface SkillProgressListProps {
  skills?: Skill[];
  title?: string;
  subtitle?: string;
}

const defaultSkills: Skill[] = [
  { name: "Algebra", percentage: 85, color: "bg-blue-500" },
  { name: "Reading Comprehension", percentage: 78, color: "bg-green-500" },
  { name: "Geometry", percentage: 72, color: "bg-purple-500" },
  { name: "Grammar", percentage: 68, color: "bg-orange-500" },
  { name: "Data Analysis", percentage: 65, color: "bg-pink-500" },
];

export function SkillProgressList({
  skills = defaultSkills,
  title = "SAT Skills Progress",
  subtitle = "Track your mastery in different subject areas",
}: SkillProgressListProps) {
  return (
    <div>
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="space-y-5">
        {skills.map((skill, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-gray-800">
                {skill.name}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-gray-900">{skill.percentage}%</span>
                <button className="w-6 h-6 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center transition-colors">
                  <span className="text-orange-600 text-xs font-bold">→</span>
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
