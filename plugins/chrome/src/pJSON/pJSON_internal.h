/*-
 * Copyright (c) 2010 Jose L. Hidalgo "PpluX" (joseluis.hidalgo@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. Neither the name of copyright holders nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL COPYRIGHT HOLDERS OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

#ifndef __pJSON_internal__
#define __pJSON_internal__

PJSON_NAMESPACE_BEGIN

	/** ValueInfo helps pJSON to identify each type, to avoid the use of RTTI with 
	  dynamic_casts */
	template<class T>
	struct ValueInfo {};

	template<>
	struct ValueInfo<Value::T_Null>
	{
		enum { V_Type = 0 };
		typedef Value::T_Null iterator;
		typedef Value::T_Null const_iterator;
	};

	template<>
	struct ValueInfo<Value::T_String>
	{
		enum { V_Type = 1 };
		typedef Value::T_String::iterator iterator;
		typedef Value::T_String::const_iterator const_iterator;
	};

	template<>
	struct ValueInfo<Value::T_Number>
	{
		enum { V_Type = 2 };
		typedef Value::T_Null iterator;
		typedef Value::T_Null const_iterator;
	};

	template<>
	struct ValueInfo<Value::T_Object>
	{
		enum { V_Type = 3 };
		typedef Value::T_Object::iterator iterator;
		typedef Value::T_Object::const_iterator const_iterator;
	};

	template<>
	struct ValueInfo<Value::T_Array>
	{
		enum { V_Type = 4 };
		typedef Value::T_Array::iterator iterator;
		typedef Value::T_Array::const_iterator const_iterator;
	};

	template<>
	struct ValueInfo<Value::T_Boolean>
	{
		enum { V_Type = 5 };
		typedef Value::T_Null iterator;
		typedef Value::T_Null const_iterator;
	};

	class PJSON_EXPORT AbstractValueData
	{
	protected:
		AbstractValueData(char type) : _type (type), _refCount(0) {}
		void ref()   { _refCount++; }
		void unref() { _refCount--; if (_refCount == 0) freeValue(); }
		char type() const { return _type; }
	private:
		void freeValue();
		char const _type;
		unsigned int _refCount;
	friend class Value;
	};

	/* This class holds the C++ Value representation */
	template<class T>
	class ValueData : public AbstractValueData
	{
	public:
		typedef T Type;
		typedef typename ValueInfo<T>::iterator iterator;
		typedef typename ValueInfo<T>::const_iterator const_iterator;

		/* Return internal reference of the object*/
		T& get() { return _data; }
		const T& get() const { return _data; }

		operator T&()  { return _data; }
		operator const T&() const { return _data; }

		/* To simulate an Object(map) */
		Value& operator[](const Value::T_String& s)
		{
			return _data[s];
		}

		const Value& operator[](const Value::T_String& s) const
		{
			static const Value invalid_value;
			const_iterator i = _data.find(s);
			if(i != _data.end()) return i->second;
			else return invalid_value;
		}

		bool hasKey (const Value::T_String& s) const
		{
			const_iterator i = _data.find(s);
			return (i != _data.end() && i->second.valid());
		}

		Value::T_Object::size_type erase( const Value::T_String& s)
		{
			return _data.erase(s);
		}

		void housekeeping()
		{
			assert(ValueInfo<T>::V_Type == ValueInfo<Value::T_Object>::V_Type);
			for(iterator i = begin(); i != end();)
			{
				if (!i->second.valid()) _data.erase(i++);
				else ++i;
			}
		}

		// extra for objects, return the keys of a map
		Value keys() const
		{
			Value v = Value::createArray();
			Value::Array &arr = v.asArray();
			for( const_iterator i = begin(); i != end(); ++i)
			{
				if (i->second.valid())
				{
					arr.push_back(i->first);
				}
			}
			return v;
		}


		/* To simulate an Array(vector) */
		Value& operator[](size_t pos) { return _data[pos]; }
		const Value& operator[](size_t pos) const { return _data[pos]; }
		void push_back(const Value &v) { _data.push_back(v);}
		iterator erase(iterator pos)
		{
			return _data.erase(pos);
		}


		/* size... */
		size_t size() const { return _data.size(); }

		/* iterators */
		iterator begin()  { return _data.begin(); }
		iterator end()    { return _data.end(); }
		iterator rbegin() { return _data.rbegin(); }
		iterator rend()   { return _data.rend(); }

		const_iterator begin() const  { return _data.begin(); }
		const_iterator end() const    { return _data.end(); }
		const_iterator rbegin() const { return _data.rbegin(); }
		const_iterator rend() const   { return _data.rend(); }


		const ValueData& operator=(const T &d) { _data=(d); return *this; }

	protected:
		ValueData() : AbstractValueData( ValueInfo<T>::V_Type ), _data() {}
		ValueData(const T &d) : AbstractValueData( ValueInfo<T>::V_Type ), _data(d) {}
		ValueData(const ValueData &o) : AbstractValueData( ValueInfo<T>::V_Type ), _data(o._data) {}
		const ValueData& operator=(const ValueData& d) { _data = d._data; return *this; }


		~ValueData() {}

	private:
		T _data;
		friend class Value;
		friend class AbstractValueData;
	};




	//--------------------------------------------------------------------
	//--------------------------------------------------------------------
	inline Value::Value() : _ptr(0)
	{
	}

	inline Value::Value(const Value &o) : _ptr(o._ptr)
	{
		if (_ptr) _ptr->ref();
	}

	inline Value& Value::operator=(const Value &o)
	{
		// call operator= 
		return (*this) = o._ptr;
	}
	
	inline Value::Value(AbstractValueData *ptr) : _ptr(ptr)
	{
		if (_ptr) _ptr->ref();
	}
	
	inline Value& Value::operator=(AbstractValueData *ptr)
	{
		if (ptr != _ptr)
		{
			AbstractValueData *old = _ptr;
			_ptr = ptr;
			if (_ptr) _ptr->ref();
			if (old) old->unref();
		}
		return *this;
	}

	inline Value::~Value() { if (_ptr) _ptr->unref(); }

	inline bool Value::isNull()    const { return (_ptr)?_ptr->type() == 0:false; }
	inline bool Value::isString()  const { return (_ptr)?_ptr->type() == 1:false; }
	inline bool Value::isNumber()  const { return (_ptr)?_ptr->type() == 2:false; }
	inline bool Value::isObject()  const { return (_ptr)?_ptr->type() == 3:false; }
	inline bool Value::isArray()   const { return (_ptr)?_ptr->type() == 4:false; }
	inline bool Value::isBoolean() const { return (_ptr)?_ptr->type() == 5:false; }
	inline char Value::type() const { if (_ptr) return _ptr->type(); else return 127; }

	inline Value::Null&    Value::asNull()   { return *static_cast<Null*>(_ptr);    }
	inline Value::String&  Value::asString() { return *static_cast<String*>(_ptr);  }
	inline Value::Number&  Value::asNumber() { return *static_cast<Number*>(_ptr);  }
	inline Value::Boolean& Value::asBoolean(){ return *static_cast<Boolean*>(_ptr); }
	inline Value::Object&  Value::asObject() { return *static_cast<Object*>(_ptr);  }
	inline Value::Array&   Value::asArray()  { return *static_cast<Array*>(_ptr);   }

	inline Value Value::createNull() { return Value(new Null()); }
	inline Value Value::createObject() { return Value(new Object()); }
	inline Value Value::createArray() { return Value(new Array()); }
	inline Value Value::createString(const T_String& s) { return Value(s); }
	inline Value Value::createNumber(T_Number n) { return Value(n); }
	inline Value Value::createBoolean(T_Boolean b) { return Value(b); } 

	inline Value Value::create() { return createNull(); }
	inline Value Value::create(const T_String& s) { return Value(s); }
	inline Value Value::create(T_Number n) { return Value(n); }
	inline Value Value::create(T_Boolean b) { return Value(b); } 

	inline Value::Value(const T_String &s) : _ptr(0)
	{
		_ptr = new String(s);
		_ptr->ref();
	}
	inline Value& Value::operator=(const T_String &s)
	{
		if (_ptr) _ptr->unref();
		_ptr = new String(s);
		_ptr->ref();
		return *this;
	}

	inline Value::Value(const T_Boolean &b) : _ptr(0)
	{
		_ptr = new Boolean(b);
		_ptr->ref();
	}
	inline Value& Value::operator=(const T_Boolean &b)
	{
		if (_ptr) _ptr->unref();
		_ptr = new Boolean(b);
		_ptr->ref();
		return *this;
	}

	inline Value::Value(const T_Number &b) : _ptr(0)
	{
		_ptr = new Number(b);
		_ptr->ref();
	}
	inline Value& Value::operator=(const T_Number &b)
	{
		if (_ptr) _ptr->unref();
		_ptr = new Number(b);
		_ptr->ref();
		return *this;
	}

	inline Value::Value(const T_Array &a) : _ptr(0)
	{
		_ptr = new Array(a);
		_ptr->ref();
	}
	inline Value& Value::operator=(const T_Array &a)
	{
		if (_ptr) _ptr->unref();
		_ptr = new Array(a);
		_ptr->ref();
		return *this;
	}

	inline Value::Value(const T_Object &o) : _ptr(0)
	{
		_ptr = new Object(o);
		_ptr->ref();
	}
	inline Value& Value::operator=(const T_Object &o)
	{
		if (_ptr) _ptr->unref();
		_ptr = new Object(o);
		_ptr->ref();
		return *this;
	}

	/* To simulate an Object(map) */
	inline Value& Value::operator[](const Value::T_String& s)
	{
		assert(isObject() && "invalid operator[] with a non-object value");
		Value::Object &obj = asObject();
		return obj[s];
	}

	inline const Value Value::operator[](const Value::T_String& s) const
	{
		if(isObject())
		{
			const Value::Object &obj = asObject();
			if (obj.hasKey(s)) return obj[s];
		}
		return Value();
	}

	inline bool Value::hasKey (const Value::T_String& s) const
	{
		if(isObject())
		{
			return asObject().hasKey(s);
		}
		return false;
	}

	inline void Value::erase( const Value::T_String &s)
	{
		assert(isObject() && "Invalid erase on a non-object value");
		asObject().erase(s);
	}

	inline Value Value::keys() const
	{
		assert(isObject() && "Invalid erase on a non-object value");
		return asObject().keys();
	}

	inline void Value::housekeeping()
	{
		assert(isObject() && "Invalid erase on a non-object value");
		asObject().housekeeping();
	}	

	/* To simulate an Array(vector) */
	inline Value& Value::operator[](size_t pos)
	{
		assert(isArray() && "invalid operator[] on a non array value");
		return asArray()[pos];
	}

	inline const Value Value::operator[](size_t pos) const
	{
		if(isArray())
		{
			return asArray()[pos];
		}
		return Value();
	}

	inline void Value::push_back(const Value &v)
	{
		assert(isArray());
		asArray().push_back(v);
	}

	inline void Value::erase( size_t pos)
	{
		assert(isArray() && "Invalid erase on a non-array value");
		Value::Array &arr = asArray();
		arr.erase( arr.begin() + pos );
	}


	/* size... */
	inline size_t Value::size() const
	{
		if (isArray()) return asArray().size();
		else if(isObject()) return asObject().size();
		else return 0;
	}

	inline Value& Text::getRoot() { return _root; }
	inline const Value& Text::getRoot() const { return _root; }

	inline std::istream& operator>>(std::istream &in, Text &t)
	{
		t.initFromStream(in);
		//TODO! if initFromStream returns false raise an exception
		return in;
	}

	inline std::ostream& operator<<(std::ostream &out, const Value *v)
	{
		if (v) v->write(out, true, 0);
		return out;
	}

	inline std::ostream& operator<<(std::ostream &out, const Value &v)
	{
		v.write(out, true, 0);
		return out;
	}

	inline std::ostream& operator<<(std::ostream &out, const Text &t)
	{
		t.write(out, true);
		return out;
	}

PJSON_NAMESPACE_END
#endif
