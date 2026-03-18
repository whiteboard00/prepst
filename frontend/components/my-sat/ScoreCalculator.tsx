"use client";

import { useState, useMemo } from "react";
import { Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCourseConfigSafe } from "@/contexts/CourseContext";

interface ModuleSliderProps {
    label: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
}

function ModuleSlider({ label, value, max, onChange }: ModuleSliderProps) {
    return (
        <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Slider
                        value={[value]}
                        max={max}
                        step={1}
                        onValueChange={([v]) => onChange(v)}
                        className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-border [&_[role=slider]]:bg-background [&_[role=slider]]:shadow-sm [&_.relative]:h-2 [&_[data-orientation=horizontal]]:h-2"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => {
                            const v = parseInt(e.target.value) || 0;
                            onChange(Math.min(max, Math.max(0, v)));
                        }}
                        className="w-14 h-9 text-center font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min={0}
                        max={max}
                    />
                    <span className="text-sm text-muted-foreground">/{max}</span>
                </div>
            </div>
        </div>
    );
}

export function ScoreCalculator() {
    const {
        course,
        config,
        sections,
        sectionScoreMin,
        sectionScoreMax,
        sectionName,
        totalScoreMin,
        totalScoreMax,
        mockExamModules,
        questionsPerModule,
        scoreMethod,
        getModuleDisplayName,
    } = useCourseConfigSafe();

    // Build max questions per module from config
    const moduleMaxQuestions: Record<string, number> = {};
    for (const mod of mockExamModules) {
        moduleMaxQuestions[mod.key] = questionsPerModule;
    }

    // State: one slider per module
    const [moduleScores, setModuleScores] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        for (const mod of mockExamModules) {
            const max = moduleMaxQuestions[mod.key] ?? 27;
            initial[mod.key] = Math.round(max * 0.75);
        }
        return initial;
    });

    const setModuleScore = (key: string, value: number) => {
        setModuleScores((prev) => ({ ...prev, [key]: value }));
    };

    // Calculate scaled scores per section
    const score = useMemo(() => {
        const sectionRaw: Record<string, { raw: number; maxRaw: number }> = {};

        for (const mod of mockExamModules) {
            if (!sectionRaw[mod.section]) {
                sectionRaw[mod.section] = { raw: 0, maxRaw: 0 };
            }
            const max = moduleMaxQuestions[mod.key] ?? 27;
            sectionRaw[mod.section].raw += moduleScores[mod.key] ?? 0;
            sectionRaw[mod.section].maxRaw += max;
        }

        const sectionScaled: Record<string, number> = {};

        for (const [sectionKey, { raw, maxRaw }] of Object.entries(sectionRaw)) {
            const min = sectionScoreMin(sectionKey);
            const max = sectionScoreMax(sectionKey);
            const range = max - min;
            const percent = maxRaw > 0 ? raw / maxRaw : 0;
            const curved = Math.pow(percent, 0.95);
            const scaled = Math.round(min + curved * range);
            sectionScaled[sectionKey] = Math.min(max, Math.max(min, scaled));
        }

        const sectionValues = Object.values(sectionScaled);
        let total: number;
        if (scoreMethod === "average" && sectionValues.length > 0) {
            total = Math.round(sectionValues.reduce((a, b) => a + b, 0) / sectionValues.length);
        } else {
            total = sectionValues.reduce((a, b) => a + b, 0);
        }
        total = Math.min(totalScoreMax, Math.max(totalScoreMin, total));

        return { sections: sectionScaled, total };
    }, [moduleScores, mockExamModules, sectionScoreMin, sectionScoreMax, totalScoreMin, totalScoreMax, scoreMethod]);

    const courseName = course?.name ?? "SAT";

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden h-full">
            {/* Header */}
            <div className="p-5 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                        <Calculator className="w-5 h-5 text-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">
                        Digital {courseName} Score Calculator
                    </h2>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Sliders Section */}
                    <div className="lg:col-span-3 space-y-6">
                        {mockExamModules.map((mod) => (
                            <ModuleSlider
                                key={mod.key}
                                label={getModuleDisplayName(mod.key)}
                                value={moduleScores[mod.key] ?? 0}
                                max={moduleMaxQuestions[mod.key] ?? 27}
                                onChange={(v) => setModuleScore(mod.key, v)}
                            />
                        ))}
                    </div>

                    {/* Results Section */}
                    <div className="lg:col-span-2">
                        <div className="border border-border rounded-xl p-6 space-y-6">
                            <h3 className="text-lg font-bold text-center text-foreground">Results</h3>

                            {/* Total Score */}
                            <div className="text-center pb-4 border-b border-border">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Total Score</p>
                                <p className="text-6xl font-bold text-foreground tabular-nums">{score.total}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {totalScoreMin}-{totalScoreMax}
                                </p>
                            </div>

                            {/* Section Scores */}
                            <div className="space-y-4">
                                {sections.map((section) => (
                                    <div key={section.key} className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">{section.name} Score</span>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-foreground tabular-nums">
                                                {score.sections[section.key] ?? section.score_min}
                                            </span>
                                            <p className="text-xs text-muted-foreground">
                                                {section.score_min} to {section.score_max}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
