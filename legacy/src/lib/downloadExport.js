import { base44 } from "@/api/base44Client";

export async function downloadExport(functionName, payload = {}) {
  const res = await base44.functions.invoke(functionName, payload);
  const data = res.data || {};
  if (data.error) throw new Error(data.error);
  const { base64, filename } = data;
  if (!base64) throw new Error("Réponse invalide");
  const link = document.createElement("a");
  link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  link.download = filename;
  link.click();
}