export interface ClassroomDate {
  day?: number;
  month?: number;
  year?: number;
}

export interface ClassroomTime {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export interface ClassroomCourse {
  alternateLink?: string;
  courseState?: string;
  descriptionHeading?: string;
  id: string;
  name: string;
  room?: string;
  section?: string;
}

export interface ClassroomCourseWork {
  alternateLink?: string;
  courseId: string;
  description?: string;
  dueDate?: ClassroomDate;
  dueTime?: ClassroomTime;
  id: string;
  maxPoints?: number;
  state?: string;
  title: string;
  workType?: string;
}

export interface ClassroomImportItem {
  course: ClassroomCourse;
  courseWork: ClassroomCourseWork[];
}

export interface ClassroomImportPayload {
  courses: ClassroomImportItem[];
  fetchedAt: string;
}
