/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Draw, DrawEntry } from '../types/luckyly.ts';
import { SUPPORTED_REGIONS } from '../config/constants.ts';
import { Users, Clock, ShieldCheck, Trophy, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DrawCardProps {
  draw: Draw;
  userEntry?: DrawEntry;
  onSelectDraw: (draw: Draw) => void;
}

export const DrawCard: React.FC<DrawCardProps> = ({
  draw,
  userEntry,
  onSelectDraw,
}) => {
  const percentComplete = Math.min(
    100,
    Math.round(((draw.currentParticipants || 0) / draw.minParticipants) * 100)
  );

  const isThresholdMet = (draw.currentParticipants || 0) >= draw.minParticipants;
  const isExecuted = draw.status === 'draw_executed';
  const isFailed = draw.status === 'minimum_not_reached';

  const deadlineFormatted = new Date(draw.deadline).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-[#12141a] border border-amber-500/20 hover:border-amber-400/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group">
      
      {/* Prize Image & Status Banner */}
      <div className="relative h-44 sm:h-48 overflow-hidden bg-[#0a0b0e]">
        {draw.imageUrl ? (
          <img
            src={draw.imageUrl}
            alt={draw.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#12141c] to-[#0a0b0e] text-amber-500/40 text-4xl font-black">
            🎁
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#12141a] via-transparent to-[#0a0b0e]/70" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#0a0b0e]/90 backdrop-blur-md text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-md">
            <span className="text-amber-400/80 font-normal">Est. Value:</span>
            <span className="text-white font-extrabold">${draw.prizeValue}</span>
          </span>

          {userEntry ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-950/90 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Entered ({userEntry.selectedRegion})</span>
            </span>
          ) : isExecuted ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#1b1c24] text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-md">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Concluded</span>
            </span>
          ) : isFailed ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-950/90 text-red-300 border border-red-700/50 flex items-center gap-1 shadow-md">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Compensated</span>
            </span>
          ) : isThresholdMet ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 flex items-center gap-1 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Threshold Met</span>
            </span>
          ) : (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-900/80 text-amber-200 border border-amber-500/30 flex items-center gap-1 shadow-md">
              <span>Free Launch Entry</span>
            </span>
          )}
        </div>

        {/* Region Flags at bottom of image */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-[#0a0b0e]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/25 text-xs shadow-md">
          <span className="text-[10px] text-amber-300/80 uppercase font-bold mr-0.5">Regions:</span>
          {draw.eligibleRegions.map(code => (
            <span key={code} title={SUPPORTED_REGIONS[code]?.name || code}>
              {SUPPORTED_REGIONS[code]?.flag || code}
            </span>
          ))}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-white mb-1.5 line-clamp-1 group-hover:text-amber-300 transition-colors">
            {draw.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {draw.description}
          </p>

          {/* Participant Threshold Progress */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">
                  {(draw.currentParticipants || 0).toLocaleString()}
                </span>
                <span className="text-slate-400">/ {draw.minParticipants.toLocaleString()} required</span>
              </div>
              <span className={`font-bold ${isThresholdMet ? 'text-amber-400' : 'text-amber-300'}`}>
                {percentComplete}%
              </span>
            </div>

            <div className="w-full h-2 bg-[#090a0d] rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isThresholdMet
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200'
                    : 'bg-gradient-to-r from-red-700 via-amber-600 to-amber-400'
                }`}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          {/* Guaranteed Alternative Compensation Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#090a0d] border border-amber-500/20 text-[11px] mb-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Alternative Safety Net:
            </span>
            <span className="font-bold text-amber-300">
              +{draw.alternativeRewardCoins} Coins
            </span>
          </div>

          {/* Winner announcement if executed */}
          {isExecuted && draw.winnerDisplayName && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                Winner: <strong>{draw.winnerDisplayName}</strong> ({draw.winnerRegion})
              </div>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Deadline: {deadlineFormatted}</span>
          </div>

          <button
            onClick={() => onSelectDraw(draw)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
              userEntry
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-500/30'
                : isExecuted || isFailed
                ? 'bg-slate-900 text-slate-400 border border-slate-800'
                : 'bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 border border-amber-400/40 shadow-red-950/40'
            }`}
          >
            <span>{userEntry ? 'View Entry' : isExecuted ? 'View Details' : 'Enter Draw'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>

      </div>
    </div>
  );
};
