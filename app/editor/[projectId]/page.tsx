import { Editor } from "@/components/editor/Editor";

/** Tab title for the editor route. */
export const metadata = { title: "Editor, Photo Craft" };

interface EditorPageProps {
  params: Promise<{ projectId: string }>;
}

/** Editor route. The project is loaded from the browser's storage on the client. */
export default async function EditorPage({ params }: EditorPageProps) {
  const { projectId } = await params;
  return <Editor projectId={projectId} />;
}
