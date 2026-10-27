import React from 'react';
import { POA_SCOPES, type CustomsPoa, type PoaScope } from '../types';
import { CheckboxField, FormSection, MultiLine, TextAreaField, TextField } from './fields';
import { SheetFrame } from './DocumentEditorLayout';

/**
 * 수출입 통관 위임장 — a Korean-language form a shipper signs so a licensed
 * customs broker can file declarations on its behalf. Brokers often ask for
 * their own wording; this is a neutral starting point, not legal advice.
 */

const SCOPE_LABEL: Record<PoaScope, string> = {
  export: '수출신고 및 관련 업무',
  import: '수입신고 및 관련 업무',
  refund: '관세 환급 신청',
  amendment: '신고 정정·취하 신청',
};

type Entity = CustomsPoa['principal'];

const cell = 'border border-gray-900 px-2 py-1.5 align-top';
const head = `${cell} w-[30mm] bg-gray-100 text-center font-semibold`;
const sideHead = `${cell} w-[16mm] bg-gray-100 text-center align-middle font-semibold`;

const EntityTable = ({
  title,
  entity,
  extra,
  sealLabel,
}: {
  title: string;
  entity: Entity;
  extra?: [string, string];
  sealLabel: string;
}) => (
  <table className='document-row w-full border-collapse'>
    <tbody>
      <tr>
        <th rowSpan={extra ? 6 : 5} className={sideHead}>
          {title}
        </th>
        <th className={head}>상호</th>
        <td className={cell}>{entity.company}</td>
      </tr>
      <tr>
        <th className={head}>사업자등록번호</th>
        <td className={cell}>{entity.registrationNo}</td>
      </tr>
      <tr>
        <th className={head}>대표자</th>
        <td className={cell}>
          <span className='flex justify-between gap-4'>
            <span>{entity.representative}</span>
            <span className='text-gray-500'>{sealLabel}</span>
          </span>
        </td>
      </tr>
      {extra && (
        <tr>
          <th className={head}>{extra[0]}</th>
          <td className={cell}>{extra[1]}</td>
        </tr>
      )}
      <tr>
        <th className={head}>주소</th>
        <td className={cell}>
          <MultiLine text={entity.address} />
        </td>
      </tr>
      <tr>
        <th className={head}>전화번호</th>
        <td className={cell}>{entity.phone}</td>
      </tr>
    </tbody>
  </table>
);

export const CustomsPoaSheet = ({ doc }: { doc: CustomsPoa }) => (
  <SheetFrame label='Customs power of attorney preview'>
    <div lang='ko' className='text-[12px]'>
      <h1 className='mb-8 text-center text-[24px] font-bold tracking-[0.5em]'>위 임 장</h1>

      <section className='document-row'>
        <h2 className='mb-1 font-semibold'>1. 위임 범위</h2>
        <ul className='space-y-1 pl-4'>
          {POA_SCOPES.map((scope) => (
            <li key={scope} className='flex items-center gap-2'>
              <span aria-hidden className='inline-block w-4 text-center'>
                {doc.scopes.includes(scope) ? '■' : '□'}
              </span>
              {SCOPE_LABEL[scope]}
            </li>
          ))}
          {doc.otherScope.trim() && (
            <li className='flex items-center gap-2'>
              <span aria-hidden className='inline-block w-4 text-center'>
                ■
              </span>
              기타: {doc.otherScope}
            </li>
          )}
        </ul>
      </section>

      <section className='document-row mt-4'>
        <h2 className='mb-1 font-semibold'>2. 위임 기간</h2>
        <p className='pl-4'>
          {doc.periodFrom || '　　　　'} 부터 {doc.periodTo || '　　　　'} 까지
        </p>
      </section>

      <section className='document-row mt-6 text-center'>
        <MultiLine text={doc.statement} />
      </section>

      <p className='document-row mt-6 text-center'>{doc.date}</p>

      <div className='mt-6 space-y-4'>
        <EntityTable title='위임인' entity={doc.principal} sealLabel='(인)' />
        <EntityTable
          title='수임인'
          entity={doc.agent}
          extra={['관세사', doc.agent.brokerName]}
          sealLabel='(인)'
        />
      </div>
    </div>
  </SheetFrame>
);

const EntityFields = ({
  entity,
  onChange,
}: {
  entity: Entity;
  onChange: (patch: Partial<Entity>) => void;
}) => (
  <>
    <TextField label='상호' value={entity.company} onChange={(company) => onChange({ company })} />
    <div className='grid grid-cols-2 gap-3'>
      <TextField
        label='사업자등록번호'
        value={entity.registrationNo}
        onChange={(registrationNo) => onChange({ registrationNo })}
      />
      <TextField
        label='대표자'
        value={entity.representative}
        onChange={(representative) => onChange({ representative })}
      />
    </div>
    <TextAreaField
      label='주소'
      rows={2}
      value={entity.address}
      onChange={(address) => onChange({ address })}
    />
    <TextField label='전화번호' value={entity.phone} onChange={(phone) => onChange({ phone })} />
  </>
);

interface FormProps {
  doc: CustomsPoa;
  update: (patch: Partial<CustomsPoa>) => void;
}

export const CustomsPoaForm = ({ doc, update }: FormProps) => {
  const toggleScope = (scope: PoaScope, on: boolean) =>
    update({
      // Kept in the canonical order so the printed checklist never reshuffles.
      scopes: POA_SCOPES.filter((s) => (s === scope ? on : doc.scopes.includes(s))),
    });

  return (
    <div className='space-y-5'>
      <p className='rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs text-gray-600 dark:text-gray-400'>
        통관을 맡길 관세사가 자체 양식을 요구하면 그 양식을 우선 사용하세요. 이 양식은 기본
        출발점입니다.
      </p>

      <FormSection title='위임 범위'>
        {POA_SCOPES.map((scope) => (
          <CheckboxField
            key={scope}
            label={SCOPE_LABEL[scope]}
            checked={doc.scopes.includes(scope)}
            onChange={(on) => toggleScope(scope, on)}
          />
        ))}
        <TextField
          label='기타 위임 사항'
          value={doc.otherScope}
          onChange={(otherScope) => update({ otherScope })}
        />
      </FormSection>

      <FormSection title='기간 · 문구'>
        <div className='grid grid-cols-2 gap-3'>
          <TextField
            label='시작일'
            value={doc.periodFrom}
            onChange={(periodFrom) => update({ periodFrom })}
          />
          <TextField
            label='종료일'
            value={doc.periodTo}
            onChange={(periodTo) => update({ periodTo })}
          />
        </div>
        <TextAreaField
          label='위임 문구'
          value={doc.statement}
          onChange={(statement) => update({ statement })}
        />
        <TextField label='작성일' value={doc.date} onChange={(date) => update({ date })} />
      </FormSection>

      <FormSection title='위임인 (화주)'>
        <EntityFields
          entity={doc.principal}
          onChange={(patch) => update({ principal: { ...doc.principal, ...patch } })}
        />
      </FormSection>

      <FormSection title='수임인 (관세사무소)'>
        <EntityFields
          entity={doc.agent}
          onChange={(patch) => update({ agent: { ...doc.agent, ...patch } })}
        />
        <TextField
          label='관세사 성명'
          value={doc.agent.brokerName}
          onChange={(brokerName) => update({ agent: { ...doc.agent, brokerName } })}
        />
      </FormSection>
    </div>
  );
};
