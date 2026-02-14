import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { categoryService, Category } from "@/lib/services/api/categoryService"
import { mediaService } from "@/lib/services/api/mediaService"

import { useEffect, useState } from "react";

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [errorCategories, setErrorCategories] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const fetchedCategories = await categoryService.getAllCategories()
        setCategories(fetchedCategories)
        setErrorCategories(null)
      } catch (error) {
        console.error("Failed to fetch categories:", error)
        setErrorCategories("Không thể tải danh mục. Vui lòng thử lại sau.")
      }
      setIsLoadingCategories(false)
    }

    fetchCategories()
  }, [])

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Danh mục</h2>
          <Button variant="ghost" className="text-blue-600 gap-1">
            Xem tất cả <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoadingCategories && Array.from({ length: 4 }).map((_, index) => (
            // Skeleton loader for categories
            <div key={index} className="group relative h-40 rounded-xl overflow-hidden bg-gray-200 animate-pulse">
              <div className="absolute bottom-0 left-0 p-4 w-full">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
          {!isLoadingCategories && errorCategories && (
            <div className="col-span-full text-center text-red-500">
              <p>{errorCategories}</p>
            </div>
          )}
          {!isLoadingCategories && !errorCategories && categories.slice(0, 4).map((category) => (
            <Link key={category._id} href={`/category/${category._id}`} className="group relative h-40 rounded-xl overflow-hidden bg-white dark:bg-gray-800 p-[10px] shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out">
              <Image
                src={mediaService.getMediaUrl(category.category_icon)}
                alt={category.category_name}
                fill
                className="object-contain transition-transform group-hover:scale-105 m-2"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-75 group-hover:opacity-50 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-[10px]">
                <h3 className="text-white font-medium text-center truncate">{category.category_name}</h3>
              </div>
            </Link>
          ))}
          {!isLoadingCategories && !errorCategories && categories.length === 0 && (
            <div className="col-span-full text-center text-gray-500">
              <p>Không tìm thấy danh mục nào.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
} 