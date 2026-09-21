import { SubjectDetailView } from "@/features/academic/components/subject-detail-view";
import { mockSubjects } from "@/features/academic/data/mock";

export function generateStaticParams() {
  return mockSubjects.map((subject) => ({ id: subject.id }));
}

export default async function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubjectDetailView subjectId={id} />;
}
