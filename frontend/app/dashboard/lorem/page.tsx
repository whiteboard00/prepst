"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoremPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lorem</h1>
        <p className="text-gray-600 mt-2">
          This is a placeholder page for the Lorem section.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This page is under development and will be implemented soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
