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

#ifndef __pJSON__
#define __pJSON__

#include <memory>
#include <map>
#include <vector>
#include <string>
#include <iostream>
#include <cassert>

#ifndef PJSON_NAMESPACE_BEGIN
	#define PJSON_NAMESPACE_BEGIN namespace pJSON {
	#define PJSON_NAMESPACE_END }
#endif

#ifndef PJSON_EXPORT
	#define PJSON_EXPORT
#endif

PJSON_NAMESPACE_BEGIN

	/* Forward declaration of the class that holds true Data */
	template<class T>
	class ValueData;

	class AbstractValueData;

	/* Base class for each possible JSON Value */
	class PJSON_EXPORT Value
	{
	public:
		// Internal BASIC types
		typedef std::string T_String;
		typedef double T_Number;
		typedef bool T_Boolean;
		struct T_Null {};
		typedef std::map<T_String, Value > T_Object;
		typedef std::vector< Value > T_Array;

		// JSON valid nodes (ValueData wrapps basic types)
		typedef ValueData<Value::T_Null>    Null;
		typedef ValueData<Value::T_String>  String;
		typedef ValueData<Value::T_Number>  Number;
		typedef ValueData<Value::T_Boolean> Boolean;
		typedef ValueData<Value::T_Object>  Object;
		typedef ValueData<Value::T_Array>   Array;

		// some functions to make Values easily
		static Value createNull();
		static Value createObject();
		static Value createArray();
		static Value createBoolean(T_Boolean b);
		static Value createNumber(T_Number n);
		static Value createString(const T_String &s);

		// overrided create
		static Value create(); //< Return Null
		static Value create(const T_String& s);
		static Value create(T_Number n);
		static Value create(T_Boolean b);

		static Value parse(std::istream &s);
		static Value parse(const std::string &s);

		/* if isNull() returns true, this forces the conversion to T_Null type, otherwise
		   the result is not defined */
		Null&    asNull();
		const Null& asNull() const { return const_cast<Value*>(this)->asNull(); }

		/* if isString() returns true, this forces the conversion to T_String type, otherwise
		   the result is not defined */
		String&  asString();
		const String& asString() const { return const_cast<Value*>(this)->asString(); }
		
		/* if isNumber() returns true, this forces the conversion to T_Number type, otherwise
		   the result is not defined */
		Number&  asNumber();
		const Number& asNumber() const { return const_cast<Value*>(this)->asNumber(); }
		
		/* if isObject() returns true, this forces the conversion to T_Object type, otherwise
		   the result is not defined */
		Object&  asObject();
		const Object& asObject() const { return const_cast<Value*>(this)->asObject(); }
		
		/* if isArray() returns true, this forces the conversion to T_Array type, otherwise
		   the result is not defined */
		Array& asArray();
		const Array& asArray() const { return const_cast<Value*>(this)->asArray(); }

		/* if isBoolean() returns true, this forces the conversion to T_Boolean type, otherwise
		   the result is not defined */
		Boolean& asBoolean();
		const Boolean& asBoolean() const { return const_cast<Value*>(this)->asBoolean(); }

		bool isNull()    const; 
		bool isString()  const; 
		bool isNumber()  const; 
		bool isObject()  const; 
		bool isArray()   const; 
		bool isBoolean() const; 
		bool valid() const { return _ptr != 0; }
		bool operator==(const Value &v) { return _ptr == v._ptr; }

		void write(std::ostream &out, bool prettyprint = true, size_t padding = 0) const;

		/* Parses epressions like "Name[0].item1["something"].prop" */
		const Value query(const std::string &) const;

		/* Performs a query and returns the Value at the given possition. If the query is not
		   valid then returns 0 */
		Value* search(const std::string&);

		/* Clones the current vaule.*/
		Value clone();

		/* To simulate an Object(map) */
		Value& operator[](const Value::T_String& s);
		const Value operator[](const Value::T_String& s) const;
		bool hasKey (const Value::T_String& s) const;
		void erase(const Value::T_String& s);
		Value keys() const;

		/* removes invalid keys. An invalid key is created each
		   time a object is accessed with a key that doesn't exist
		   and the content is not replaced. This method only works
		   on objects. */
		void housekeeping();

		/* To simulate an Array(vector) */
		Value& operator[](size_t pos);
		const Value operator[](size_t pos) const;
		void push_back(const Value &v);
		void erase(size_t pos);

		/* size... */
		size_t size() const;

		Value();
		Value(const Value &o);
		Value(AbstractValueData *ptr);
		Value& operator=(const Value &o);
		Value& operator=(AbstractValueData *ptr);
		~Value();

		Value(const T_String &);
		Value& operator=(const T_String &);
		Value(const T_Boolean &);
		Value& operator=(const T_Boolean &);
		Value(const T_Number &);
		Value& operator=(const T_Number &);
		Value(const T_Array &);
		Value& operator=(const T_Array &);
		Value(const T_Object &);
		Value& operator=(const T_Object &);
	protected:

		char type() const ;

		friend class ValuePtr;

	private:
		AbstractValueData *_ptr;
	};

	/* Text class holds a complete JSON message */
	class PJSON_EXPORT Text
	{
	public:
		/** Text constructor, will initialize the root node with Null, so
		    it is not a valid JSON message. You should call @initWithObject,
			@initWithArray, or @initFromStream to initialize the object. */
		Text();
		~Text();

		/// Initializes the Text with an Object
		Value::Object& initWithObject();

		/// Initializes the Text with an Array
		Value::Array& initWithArray();

		/// Returns the root value T_Object | T_Array | 0 (null) read only
		const Value& getRoot() const;

		/// Returns the root value T_Object | T_Array | 0 (null) read only
		Value& getRoot();

		/* tries to read a JSON message from the given istream, returns
	       true on success and updates the root node, false otherwise and
		   the root node is not replaced. */
		bool initFromStream(std::istream&);

		void write(std::ostream&, bool prettyPrint = true) const;
	private:
		Value _root;
	};

	std::istream& operator>>(std::istream &stream, Text &ref);
	std::ostream& operator<<(std::ostream &out, const Value *v);
	std::ostream& operator<<(std::ostream &out, const Value &v);
	std::ostream& operator<<(std::ostream &o, const Text &ref);

PJSON_NAMESPACE_END

#include "pJSON_internal.h" // Internal classes and inline implementations

#endif
