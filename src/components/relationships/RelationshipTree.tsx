import React from 'react';
import { GitCommit, ArrowRight, Database, Image, Globe, Download } from 'lucide-react';
import type { ArtifactRelationship } from '../../types';

interface RelationshipTreeProps {
  relationships: ArtifactRelationship[];
  onSelectArtifact?: (type: string, id: string) => void;
}

export const RelationshipTree: React.FC<RelationshipTreeProps> = ({
  relationships,
  onSelectArtifact,
}) => {
  if (relationships.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 font-mono">
        No evidence-based relationships discovered for this artifact.
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'EVIDENCE':
        return <Database className="h-3.5 w-3.5 text-blue-600" />;
      case 'IMAGE_ARTIFACT':
        return <Image className="h-3.5 w-3.5 text-emerald-600" />;
      case 'BROWSER_DOWNLOAD':
        return <Download className="h-3.5 w-3.5 text-purple-600" />;
      case 'BROWSER_EVIDENCE':
      case 'BROWSER_HISTORY':
        return <Globe className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return <GitCommit className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-2 font-mono text-xs">
      {relationships.map((rel) => (
        <div
          key={rel.id}
          className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              {getIcon(rel.sourceType)}
              <span
                onClick={() => onSelectArtifact && onSelectArtifact(rel.sourceType, rel.sourceId)}
                className="hover:underline cursor-pointer"
              >
                {rel.sourceType} ({rel.sourceId.substring(0, 10)}...)
              </span>
            </div>

            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />

            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              {getIcon(rel.targetType)}
              <span
                onClick={() => onSelectArtifact && onSelectArtifact(rel.targetType, rel.targetId)}
                className="hover:underline cursor-pointer"
              >
                {rel.targetType} ({rel.targetId.substring(0, 10)}...)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-bold text-slate-700">
              {rel.relationType}
            </span>
            {rel.confidence && (
              <span
                className={`rounded px-1.5 py-0.5 font-bold ${rel.confidence === 'EXPLICIT'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
              >
                {rel.confidence}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
