import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function StatusBadge({ type, value }) {
  if (!value) return null;
  const val = String(value).toUpperCase();

  // 1. Policy Decision Badges
  if (type === 'decision' || val === 'ALLOW' || val === 'BLOCK' || val === 'MANUAL_REVIEW') {
    if (val === 'ALLOW') {
      return (
        <span className="badge badge-allow">
          <ShieldCheck size={13} />
          ALLOW
        </span>
      );
    }
    if (val === 'BLOCK') {
      return (
        <span className="badge badge-block">
          <ShieldAlert size={13} />
          BLOCK
        </span>
      );
    }
    return (
      <span className="badge badge-review">
        <AlertTriangle size={13} />
        MANUAL REVIEW
      </span>
    );
  }

  // 2. Company Tier Category Badges
  if (type === 'category' || ['A+', 'A', 'B', 'C'].includes(val)) {
    if (val === 'A+') {
      return <span className="badge badge-category-aplus">Tier A+ (Dream ≥16 LPA)</span>;
    }
    if (val === 'A') {
      return <span className="badge badge-category-a">Tier A (10–16 LPA)</span>;
    }
    if (val === 'B') {
      return <span className="badge badge-category-b">Tier B (6–10 LPA)</span>;
    }
    return <span className="badge badge-category-c">Tier C (&lt;6 LPA)</span>;
  }

  // 3. Offer Type Badges
  if (type === 'offer_type' || ['I', 'F', 'I+F'].includes(val)) {
    if (val === 'I+F') {
      return <span className="badge badge-offer-if">Internship + FTE (I+F)</span>;
    }
    if (val === 'I') {
      return <span className="badge badge-offer-i">Internship Only (I)</span>;
    }
    return <span className="badge badge-offer-f">FTE Only (F)</span>;
  }

  // 4. Registration & Academic Eligibility
  if (val === 'REGISTERED' || val === 'ELIGIBLE' || val === 'ACCEPTED' || val === 'JOINED') {
    return (
      <span className="badge badge-allow">
        <CheckCircle2 size={12} />
        {value}
      </span>
    );
  }

  if (val === 'DEREGISTERED' || val === 'INELIGIBLE' || val === 'DECLINED' || val === 'EXPIRED') {
    return (
      <span className="badge badge-block">
        <XCircle size={12} />
        {value}
      </span>
    );
  }

  if (val === 'PENDING' || val === 'PENDING_VERIFICATION') {
    return (
      <span className="badge badge-review">
        <Clock size={12} />
        {value.replace('_', ' ')}
      </span>
    );
  }

  return <span className="badge badge-category-c">{value}</span>;
}
