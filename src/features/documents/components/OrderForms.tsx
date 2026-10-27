import React from 'react';
import { emptyOrderLine } from '../defaults';
import type { OrderLine, PurchaseOrder, SalesContract } from '../types';
import { FormSection, NumberField, SelectField, TextAreaField, TextField } from './fields';
import { CurrencyField, INCOTERMS, LineList, PartyFields } from './formParts';
import { LogoField } from './LogoField';

interface FormProps<T> {
  doc: T;
  update: (patch: Partial<T>) => void;
}

const OrderLineFields = ({
  line,
  currency,
  onChange,
}: {
  line: OrderLine;
  currency: string;
  onChange: (patch: Partial<OrderLine>) => void;
}) => (
  <>
    <TextField
      label='Description'
      value={line.description}
      onChange={(description) => onChange({ description })}
    />
    <TextAreaField
      label='Specification'
      rows={2}
      value={line.specification}
      onChange={(specification) => onChange({ specification })}
    />
    <div className='grid grid-cols-3 gap-3'>
      <NumberField
        label='Quantity'
        value={line.quantity}
        onChange={(quantity) => onChange({ quantity })}
      />
      <TextField label='Unit' value={line.unit} onChange={(unit) => onChange({ unit })} />
      <NumberField
        label={`Unit price (${currency})`}
        step={0.01}
        value={line.unitPrice}
        onChange={(unitPrice) => onChange({ unitPrice })}
      />
    </div>
  </>
);

const VARIANTS = [
  { value: 'offer', label: 'Offer sheet (seller’s offer)' },
  { value: 'contract', label: 'Sales contract (signed by both)' },
] as const;

export const SalesContractForm = ({ doc, update }: FormProps<SalesContract>) => (
  <div className='space-y-5'>
    <FormSection title='Document'>
      <SelectField
        label='Document type'
        value={doc.variant}
        options={VARIANTS}
        onChange={(variant) => update({ variant })}
      />
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Reference No.'
          value={doc.refNo}
          onChange={(refNo) => update({ refNo })}
        />
        <TextField label='Date' value={doc.date} onChange={(date) => update({ date })} />
        <TextField
          label='Valid until'
          value={doc.validUntil}
          onChange={(validUntil) => update({ validUntil })}
        />
        <CurrencyField value={doc.currency} onChange={(currency) => update({ currency })} />
      </div>
      <LogoField value={doc.logo} onChange={(logo) => update({ logo })} />
    </FormSection>

    <FormSection title='Seller'>
      <PartyFields party={doc.seller} onChange={(seller) => update({ seller })} />
    </FormSection>
    <FormSection title='Buyer'>
      <PartyFields party={doc.buyer} onChange={(buyer) => update({ buyer })} />
    </FormSection>

    <LineList
      title='Goods'
      items={doc.items}
      onChange={(items) => update({ items })}
      create={emptyOrderLine}
      renderLine={(line, patch) => (
        <OrderLineFields line={line} currency={doc.currency} onChange={patch} />
      )}
    />

    <FormSection title='Terms'>
      <div className='grid grid-cols-2 gap-3'>
        <SelectField
          label='Incoterm'
          value={doc.incoterm}
          options={INCOTERMS}
          onChange={(incoterm) => update({ incoterm })}
        />
        <TextField
          label='Named place'
          value={doc.namedPlace}
          onChange={(namedPlace) => update({ namedPlace })}
        />
        <TextField label='Origin' value={doc.origin} onChange={(origin) => update({ origin })} />
        <TextField
          label='Shipment period'
          value={doc.shipmentPeriod}
          onChange={(shipmentPeriod) => update({ shipmentPeriod })}
        />
        <TextField
          label='Port of loading'
          value={doc.portOfLoading}
          onChange={(portOfLoading) => update({ portOfLoading })}
        />
        <TextField
          label='Port of destination'
          value={doc.portOfDestination}
          onChange={(portOfDestination) => update({ portOfDestination })}
        />
      </div>
      <TextField label='Packing' value={doc.packing} onChange={(packing) => update({ packing })} />
      <TextField label='Payment' value={doc.payment} onChange={(payment) => update({ payment })} />
      <TextField
        label='Inspection'
        value={doc.inspection}
        onChange={(inspection) => update({ inspection })}
      />
      <TextField
        label='Insurance'
        value={doc.insurance}
        onChange={(insurance) => update({ insurance })}
      />
      <TextAreaField
        label='Other terms (claims, governing law, arbitration…)'
        rows={4}
        value={doc.otherTerms}
        onChange={(otherTerms) => update({ otherTerms })}
      />
    </FormSection>

    <FormSection title='Signatures'>
      <div className='grid grid-cols-2 gap-3'>
        <TextField
          label='Seller signatory'
          value={doc.sellerSignatory}
          onChange={(sellerSignatory) => update({ sellerSignatory })}
        />
        <TextField
          label='Buyer signatory'
          value={doc.buyerSignatory}
          onChange={(buyerSignatory) => update({ buyerSignatory })}
        />
      </div>
    </FormSection>
  </div>
);

export const PurchaseOrderForm = ({ doc, update }: FormProps<PurchaseOrder>) => (
  <div className='space-y-5'>
    <FormSection title='Order'>
      <div className='grid grid-cols-2 gap-3'>
        <TextField label='PO No.' value={doc.poNo} onChange={(poNo) => update({ poNo })} />
        <TextField label='Date' value={doc.date} onChange={(date) => update({ date })} />
        <TextField
          label='Required delivery date'
          value={doc.deliveryDate}
          onChange={(deliveryDate) => update({ deliveryDate })}
        />
        <SelectField
          label='Incoterm'
          value={doc.incoterm}
          options={INCOTERMS}
          onChange={(incoterm) => update({ incoterm })}
        />
        <TextField
          label='Payment terms'
          value={doc.paymentTerms}
          onChange={(paymentTerms) => update({ paymentTerms })}
        />
        <TextField
          label='Shipping method'
          value={doc.shippingMethod}
          onChange={(shippingMethod) => update({ shippingMethod })}
        />
        <CurrencyField value={doc.currency} onChange={(currency) => update({ currency })} />
        <NumberField
          label='Tax rate (%)'
          step={0.1}
          value={doc.taxRate}
          onChange={(taxRate) => update({ taxRate: Math.min(taxRate, 100) })}
        />
      </div>
      <LogoField value={doc.logo} onChange={(logo) => update({ logo })} />
    </FormSection>

    <FormSection title='Buyer'>
      <PartyFields party={doc.buyer} onChange={(buyer) => update({ buyer })} />
    </FormSection>
    <FormSection title='Supplier'>
      <PartyFields party={doc.supplier} onChange={(supplier) => update({ supplier })} />
    </FormSection>
    <FormSection title='Ship to (leave blank if same as buyer)'>
      <PartyFields party={doc.shipTo} onChange={(shipTo) => update({ shipTo })} />
    </FormSection>

    <LineList
      title='Items'
      addLabel='Add item'
      items={doc.items}
      onChange={(items) => update({ items })}
      create={emptyOrderLine}
      renderLine={(line, patch) => (
        <OrderLineFields line={line} currency={doc.currency} onChange={patch} />
      )}
    />

    <FormSection title='Footer'>
      <TextAreaField label='Notes' value={doc.notes} onChange={(notes) => update({ notes })} />
      <TextField
        label='Signatory name'
        value={doc.signatory}
        onChange={(signatory) => update({ signatory })}
      />
    </FormSection>
  </div>
);
