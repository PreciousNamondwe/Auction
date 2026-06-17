"use client";

import React, { useState } from "react";
import { Trash2, LayoutGrid, DollarSign, UploadCloud } from "lucide-react";
import { createAssetAndAuction } from "@/app/actions/createAssetAndAuction";
import { useRouter } from "next/navigation";

export default function AuctioneerManageAssets() {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("REAL_ESTATE");
  const [customCategory, setCustomCategory] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  const [dynamicAttributes, setDynamicAttributes] = useState([
    { key: "Condition", value: "Excellent" }
  ]);

  const [form, setForm] = useState({
    title: "", description: "", location: "", documentUrl: "",
    startingBid: "", reservePrice: "", depositAmount: ""
  });

  const addSpecificationRow = () => setDynamicAttributes([...dynamicAttributes, { key: "", value: "" }]);
  const removeSpecificationRow = (index) => {
    const values = [...dynamicAttributes];
    values.splice(index, 1);
    setDynamicAttributes(values);
  };

  const handleSpecChange = (index, event, field) => {
    const updatedSpecs = [...dynamicAttributes];
    updatedSpecs[index][field] = event.target.value;
    setDynamicAttributes(updatedSpecs);
  };

  const handlePublishAuction = async (e) => {
    e.preventDefault();
    try {
      setIsPublishing(true);
      const finalCategory = selectedCategory === "OTHER" ? customCategory : selectedCategory;
      if (!finalCategory) throw new Error("Please specify your custom category name.");

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("location", form.location);
      formData.append("documentUrl", form.documentUrl);
      formData.append("startingBid", form.startingBid);
      formData.append("reservePrice", form.reservePrice);
      formData.append("depositAmount", form.depositAmount);
      formData.append("category", finalCategory);
      formData.append("dynamicAttributes", JSON.stringify(dynamicAttributes));

      if (uploadedFile) {
        formData.append("assetImageFile", uploadedFile);
      } else {
        throw new Error("Please attach a primary display image photograph.");
      }

      const res = await createAssetAndAuction(formData);
      if (res.success) {
        alert(`🎉 Lot Registered Successfully! Added to database registry.`);
        setForm({ title: "", description: "", location: "", documentUrl: "", startingBid: "", reservePrice: "", depositAmount: "" });
        setDynamicAttributes([{ key: "Condition", value: "Excellent" }]);
        setUploadedFile(null);
        e.target.reset(); 
        router.refresh();
      }
    } catch (err) {
      alert(err.message || "Binary upload failure.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <form onSubmit={handlePublishAuction} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Register Brand New Asset Campaign</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none w-full sm:w-auto">
            <option value="REAL_ESTATE">🏠 Real Estate Property</option>
            <option value="VEHICLE">🚗 Vehicles & Cars</option>
            <option value="ELECTRONICS">💻 Tech & Electronics</option>
            <option value="MACHINERY">⚙️ Heavy Machinery</option>
            <option value="OTHER">✨ OTHER / CUSTOM CATEGORY</option>
          </select>
          {selectedCategory === "OTHER" && (
            <input type="text" placeholder="Type Custom Category..." value={customCategory} onChange={(e) => setCustomCategory(e.target.value.toUpperCase())} required className="bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 px-3 py-2 rounded-xl focus:outline-none" />
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Asset Name / Title</label>
            <input type="text" required placeholder="e.g. 3 Bedroom Residential Property - Area 47" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs rounded-xl focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Physical Location</label>
            <input type="text" required placeholder="e.g. Lilongwe City Centre" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs rounded-xl focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Comprehensive Lot Description</label>
          <textarea required placeholder="Outline legal descriptors, physical attributes, title deed statuses..." value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs rounded-xl h-24 resize-none focus:outline-none" />
        </div>

        {/* Dynamic Specifications */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Dynamic Specifications Engine Block</span>
            <button type="button" onClick={addSpecificationRow} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700">
              + Add Dynamic Field
            </button>
          </div>
          {dynamicAttributes.map((element, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input type="text" placeholder="Label (e.g. Plot Size)" value={element.key} onChange={(e) => handleSpecChange(index, e, "key")} className="flex-1 bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-none" />
              <input type="text" placeholder="Value (e.g. 0.25 Hectares)" value={element.value} onChange={(e) => handleSpecChange(index, e, "value")} className="flex-1 bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-none" />
              {dynamicAttributes.length > 1 && (
                <button type="button" onClick={() => removeSpecificationRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Asset Display Image Upload</label>
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center hover:bg-slate-50 transition-all">
              <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-[10px] font-semibold text-slate-600 max-w-[250px] truncate">
                {uploadedFile ? `Selected: ${uploadedFile.name}` : "Click to select asset photo"}
              </span>
              <input type="file" accept="image/*" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Legal Document Link</label>
            <input type="url" placeholder="https://your-host-cdn.com/file.pdf" value={form.documentUrl} onChange={(e) => setForm({...form, documentUrl: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs rounded-xl focus:outline-none" />
          </div>
        </div>

        <div className="bg-indigo-50/20 p-4 border border-indigo-100/40 rounded-xl">
          <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-2 mb-3">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Financial Pricing Framework</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Starting Bid (MWK)</label>
              <input type="number" required placeholder="5000000" value={form.startingBid} onChange={(e) => setForm({...form, startingBid: e.target.value})} className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs rounded-xl focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reserve Price (MWK)</label>
              <input type="number" required placeholder="7500000" value={form.reservePrice} onChange={(e) => setForm({...form, reservePrice: e.target.value})} className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs rounded-xl focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Security Deposit (MWK)</label>
              <input type="number" required placeholder="250000" value={form.depositAmount} onChange={(e) => setForm({...form, depositAmount: e.target.value})} className="w-full bg-white border border-slate-200 px-3 py-2.5 text-xs rounded-xl focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPublishing} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:bg-slate-300">
            {isPublishing ? "Adding item..." : "Save Asset & Add to Inventory"}
          </button>
        </div>
      </div>
    </form>
  );
}