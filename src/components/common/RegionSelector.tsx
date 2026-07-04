import { useState, useEffect, useMemo, useRef } from 'react';
import levelData from 'province-city-china/dist/level.json';

interface LevelItem {
  code: string;
  name: string;
  children?: LevelItem[];
}

export interface RegionDetail {
  province: string;
  city: string;
  area: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onChangeDetail?: (detail: RegionDetail) => void;
  error?: string;
}

// 判断是否为直辖市：子元素没有 children，说明省下面直接是区
function isMunicipality(prov: LevelItem | undefined): boolean {
  if (!prov?.children?.length) return false;
  return !prov.children[0].children;
}

export default function RegionSelector({ value, onChange, onChangeDetail, error }: Props) {
  const data = levelData as LevelItem[];

  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [, setAreaCode] = useState('');

  // 本地输入状态
  const [inputProvince, setInputProvince] = useState('');
  const [inputCity, setInputCity] = useState('');
  const [inputArea, setInputArea] = useState('');

  const provinces = useMemo(() => data, [data]);

  const currentProv = useMemo(() => provinces.find(p => p.code === provinceCode), [provinceCode, provinces]);
  const isDirectCity = useMemo(() => isMunicipality(currentProv), [currentProv]);

  const cities = useMemo(() => {
    if (!currentProv) return [];
    if (isDirectCity) {
      // 直辖市：市组件显示省本身（构造一个虚拟市项）
      return [{ code: currentProv.code, name: currentProv.name }];
    }
    return currentProv.children || [];
  }, [currentProv, isDirectCity]);

  const areas = useMemo(() => {
    if (!currentProv) return [];
    if (isDirectCity) {
      // 直辖市：区直接从省 children 取
      return currentProv.children || [];
    }
    const city = currentProv.children?.find(c => c.code === cityCode);
    return city?.children || [];
  }, [currentProv, cityCode, isDirectCity]);

  // 用于避免 onChangeDetail 作为 useEffect 依赖导致无限循环
  const onChangeDetailRef = useRef(onChangeDetail);
  onChangeDetailRef.current = onChangeDetail;

  // 用于避免重复触发 onChangeDetail
  const lastEmittedRef = useRef<RegionDetail | null>(null);

  function emitDetail(detail: RegionDetail) {
    const last = lastEmittedRef.current;
    if (!last || last.province !== detail.province || last.city !== detail.city || last.area !== detail.area) {
      lastEmittedRef.current = detail;
      onChangeDetailRef.current?.(detail);
    }
  }

  // 根据当前 value 回显省市区，并同步拆分值
  useEffect(() => {
    if (!value) {
      setProvinceCode('');
      setCityCode('');
      setAreaCode('');
      setInputProvince('');
      setInputCity('');
      setInputArea('');
      emitDetail({ province: '', city: '', area: '' });
      return;
    }
    for (const prov of data) {
      if (value.startsWith(prov.name)) {
        setProvinceCode(prov.code);
        setInputProvince(prov.name);
        const remain = value.slice(prov.name.length);

        if (isMunicipality(prov)) {
          // 直辖市：没有真实市层级，市输入框自动填省名
          setCityCode(prov.code);
          setInputCity(prov.name);
          // 在剩余字符中匹配区
          for (const area of prov.children || []) {
            if (remain.includes(area.name)) {
              setAreaCode(area.code);
              setInputArea(area.name);
              emitDetail({ province: prov.name, city: prov.name, area: area.name });
              return;
            }
          }
          setAreaCode('');
          setInputArea('');
          emitDetail({ province: prov.name, city: prov.name, area: '' });
          return;
        }

        // 普通省
        for (const city of prov.children || []) {
          if (remain.includes(city.name)) {
            setCityCode(city.code);
            setInputCity(city.name);
            const remain2 = remain.slice(remain.indexOf(city.name) + city.name.length);
            for (const area of city.children || []) {
              if (remain2.includes(area.name)) {
                setAreaCode(area.code);
                setInputArea(area.name);
                emitDetail({ province: prov.name, city: city.name, area: area.name });
                return;
              }
            }
            setAreaCode('');
            setInputArea('');
            emitDetail({ province: prov.name, city: city.name, area: '' });
            return;
          }
        }
        setCityCode('');
        setAreaCode('');
        setInputCity('');
        setInputArea('');
        emitDetail({ province: prov.name, city: '', area: '' });
        return;
      }
    }
    // value 无法解析任何省份，清空
    setProvinceCode('');
    setCityCode('');
    setAreaCode('');
    setInputProvince('');
    setInputCity('');
    setInputArea('');
    emitDetail({ province: '', city: '', area: '' });
  }, [value, data]);

  const handleProvinceChange = (val: string) => {
    setInputProvince(val);
    const found = provinces.find(p => p.name === val.trim());
    if (found) {
      setProvinceCode(found.code);
      setAreaCode('');
      setInputArea('');

      if (isMunicipality(found)) {
        // 直辖市：市自动填省名，区直接选
        setCityCode(found.code);
        setInputCity(found.name);
        onChange(found.name);
        emitDetail({ province: found.name, city: found.name, area: '' });
      } else {
        setCityCode('');
        setInputCity('');
        onChange(found.name);
        emitDetail({ province: found.name, city: '', area: '' });
      }
    } else if (!val.trim()) {
      setProvinceCode('');
      setCityCode('');
      setAreaCode('');
      setInputCity('');
      setInputArea('');
      onChange('');
      emitDetail({ province: '', city: '', area: '' });
    }
  };

  const handleCityChange = (val: string) => {
    setInputCity(val);
    const found = cities.find(c => c.name === val.trim());
    if (found && !isDirectCity) {
      setCityCode(found.code);
      setAreaCode('');
      setInputArea('');
      const prov = currentProv;
      if (prov) {
        onChange(prov.name + found.name);
        emitDetail({ province: prov.name, city: found.name, area: '' });
      }
    } else if (!val.trim() && !isDirectCity) {
      setCityCode('');
      setAreaCode('');
      setInputArea('');
      const prov = currentProv;
      if (prov) {
        onChange(prov.name);
        emitDetail({ province: prov.name, city: '', area: '' });
      }
    }
  };

  const handleAreaChange = (val: string) => {
    setInputArea(val);
    const found = areas.find(a => a.name === val.trim());
    if (found) {
      setAreaCode(found.code);
      const prov = currentProv;
      if (isDirectCity) {
        // 直辖市：输出 省 + 区
        if (prov) {
          onChange(prov.name + found.name);
          emitDetail({ province: prov.name, city: prov.name, area: found.name });
        }
      } else {
        const city = cities.find(c => c.code === cityCode);
        if (prov && city) {
          onChange(prov.name + city.name + found.name);
          emitDetail({ province: prov.name, city: city.name, area: found.name });
        }
      }
    } else if (!val.trim()) {
      setAreaCode('');
      const prov = currentProv;
      if (isDirectCity) {
        if (prov) {
          onChange(prov.name);
          emitDetail({ province: prov.name, city: prov.name, area: '' });
        }
      } else {
        const city = cities.find(c => c.code === cityCode);
        if (prov && city) {
          onChange(prov.name + city.name);
          emitDetail({ province: prov.name, city: city.name, area: '' });
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <input
            list="province-list"
            className={`form-input ${error ? 'form-input-error' : ''}`}
            value={inputProvince}
            onChange={e => handleProvinceChange(e.target.value)}
            placeholder="请选择省"
          />
          <datalist id="province-list">
            {provinces.map(p => (
              <option key={p.code} value={p.name} />
            ))}
          </datalist>
        </div>

        <div>
          <input
            list={isDirectCity ? undefined : 'city-list'}
            className={`form-input ${error ? 'form-input-error' : ''} ${isDirectCity ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            value={inputCity}
            onChange={e => handleCityChange(e.target.value)}
            placeholder="请选择市"
            disabled={!provinceCode || isDirectCity}
          />
          {!isDirectCity && (
            <datalist id="city-list">
              {cities.map(c => (
                <option key={c.code} value={c.name} />
              ))}
            </datalist>
          )}
        </div>

        <div>
          <input
            list="area-list"
            className={`form-input ${error ? 'form-input-error' : ''}`}
            value={inputArea}
            onChange={e => handleAreaChange(e.target.value)}
            placeholder="请选择区/县"
            disabled={!cityCode}
          />
          <datalist id="area-list">
            {areas.map(a => (
              <option key={a.code} value={a.name} />
            ))}
          </datalist>
        </div>
      </div>
      {error && <p className="form-error-msg">{error}</p>}
    </div>
  );
}
